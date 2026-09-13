import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { History as HistoryIcon } from 'lucide-react';

import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { usePageTitle } from '../hooks/usePageTitle';
import { useHistoryFilters } from '../hooks/useHistoryFilters';
import { PAGE_SIZE, STORAGE_COLUMNS, STORAGE_DENSITY, loadColumnPrefs, loadDensity } from '../lib/historyConfig';

import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import { SkeletonTable } from '../components/ui/Skeleton';

import HistoryPageHeader from '../components/history/HistoryPageHeader';
import HistoryStats from '../components/history/HistoryStats';
import HistoryFilterBar from '../components/history/HistoryFilterBar';
import HistoryAdvancedFilters from '../components/history/HistoryAdvancedFilters';
import HistoryBulkActions from '../components/history/HistoryBulkActions';
import HistoryTable from '../components/history/HistoryTable';
import HistoryPagination from '../components/history/HistoryPagination';
import HistoryDetailDrawer from '../components/history/HistoryDetailDrawer';
import HistoryComparisonModal from '../components/history/HistoryComparisonModal';

export default function History() {
  usePageTitle('History');
  const { user } = useAuth();
  const qc = useQueryClient();
  const isAdmin = user?.role === 'admin';

  const {
    filters,
    searchInput,
    setSearchInput,
    updateFilter,
    resetFilters,
    filterParams,
    hasActiveFilters,
    toggleSort,
  } = useHistoryFilters();

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [columnPrefs, setColumnPrefs] = useState(loadColumnPrefs);
  const [density, setDensity] = useState(loadDensity);
  const [selectedIds, setSelectedIds] = useState([]);
  const [detailId, setDetailId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [showCompare, setShowCompare] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_COLUMNS, JSON.stringify(columnPrefs));
  }, [columnPrefs]);

  useEffect(() => {
    localStorage.setItem(STORAGE_DENSITY, density);
  }, [density]);

  const { data: options } = useQuery({
    queryKey: ['history-options'],
    queryFn: () => api.getOptions(),
    staleTime: 10 * 60 * 1000,
  });

  const { data: stats } = useQuery({
    queryKey: ['history-stats'],
    queryFn: () => api.getPredictionStats(),
    staleTime: 60_000,
  });

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['history', filterParams, filters.page],
    queryFn: () => api.getPredictions(PAGE_SIZE, filters.page * PAGE_SIZE, filterParams),
    staleTime: 30_000,
  });

  const records = data?.records ?? (Array.isArray(data) ? data : []);
  const total = data?.total ?? records.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const deleteMutation = useMutation({
    mutationFn: (recordId) => api.deletePrediction(recordId),
    onSuccess: () => {
      toast.success('Record deleted');
      qc.invalidateQueries({ queryKey: ['history'] });
      qc.invalidateQueries({ queryKey: ['history-stats'] });
      setConfirmDelete(null);
      setDetailId(null);
    },
    onError: (err) => toast.error(err.message || 'Delete failed'),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids) => api.bulkDeletePredictions(ids),
    onSuccess: (res) => {
      toast.success(`Deleted ${res.deleted} records`);
      qc.invalidateQueries({ queryKey: ['history'] });
      qc.invalidateQueries({ queryKey: ['history-stats'] });
      setSelectedIds([]);
      setConfirmDelete(null);
    },
    onError: (err) => toast.error(err.message || 'Bulk delete failed'),
  });

  const toggleSelected = useCallback((id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  const toggleAll = useCallback(() => {
    setSelectedIds((prev) =>
      prev.length === records.length ? [] : records.map((r) => r.record_id),
    );
  }, [records]);

  const copyRecordId = (id) => {
    navigator.clipboard.writeText(id);
    toast.success('Record ID copied');
  };

  const exportCSV = () => {
    const token = localStorage.getItem('amr-nexus-token');
    const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    fetch(`${base}/predictions/export/csv?${filterParams}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.blob())
      .then((blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `amr_history_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
      })
      .catch(() => toast.error('Export failed'));
  };

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(records, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `amr_history_page_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const exportSelected = () => {
    if (selectedIds.length === 0) return;
    const selected = records.filter((r) => selectedIds.includes(r.record_id));
    const headers = [
      'record_id', 'timestamp', 'pathogen_code', 'county', 'sub_county',
      'sector', 'mdr_flag', 'mdr_probability', 'anomaly_flag', 'anomaly_score',
    ];
    const rows = selected.map((r) => [
      r.record_id, r.timestamp, r.pathogen_code, r.county, r.sub_county,
      r.sector, r.mdr_flag, r.mdr_probability, r.anomaly_detected, r.anomaly_score,
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `amr_history_selected_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success(`Exported ${selected.length} rows`);
  };

  useEffect(() => {
    const handler = (e) => {
      const tag = document.activeElement?.tagName;
      const isTyping =
        tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' ||
        document.activeElement?.isContentEditable;
      if (isTyping) return;

      if (e.key === '/') {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key === 'r') {
        e.preventDefault();
        refetch();
      } else if (e.key === 'e') {
        e.preventDefault();
        exportCSV();
      } else if (e.key === 'c' && selectedIds.length >= 2) {
        e.preventDefault();
        setShowCompare(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIds, refetch]);

  const compareRecords = records.filter((r) => selectedIds.includes(r.record_id));

  return (
    <div className="space-y-5">
      <HistoryPageHeader
        onRefresh={() => refetch()}
        isFetching={isFetching}
        onExportCSV={exportCSV}
        onExportJSON={exportJSON}
      />

      <HistoryStats stats={stats} />

      <HistoryFilterBar
        filters={filters}
        onChange={updateFilter}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        searchRef={searchRef}
        showAdvanced={showAdvanced}
        onToggleAdvanced={() => setShowAdvanced((v) => !v)}
        hasActiveFilters={hasActiveFilters}
        onReset={resetFilters}
        density={density}
        onDensityChange={setDensity}
        columnPrefs={columnPrefs}
        onColumnPrefsChange={setColumnPrefs}
      />

      {showAdvanced && (
        <HistoryAdvancedFilters
          filters={filters}
          onChange={updateFilter}
          options={options}
        />
      )}

      <HistoryBulkActions
        count={selectedIds.length}
        onClear={() => setSelectedIds([])}
        onCompare={() => setShowCompare(true)}
        onExport={exportSelected}
        onDelete={() => setConfirmDelete({ bulk: true, ids: selectedIds })}
        isAdmin={isAdmin}
      />

      <div className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] overflow-hidden">
        {isLoading ? (
          <div className="p-5">
            <SkeletonTable rows={6} cols={5} />
          </div>
        ) : isError ? (
          <EmptyState
            icon={HistoryIcon}
            title="Could not load history"
            description={error?.message || 'Try again in a moment.'}
          />
        ) : records.length === 0 ? (
          <EmptyState
            icon={HistoryIcon}
            title="No records match"
            description={
              hasActiveFilters
                ? 'Try adjusting your filters.'
                : 'Submit a new prediction to see records here.'
            }
          />
        ) : (
          <>
            <HistoryTable
              records={records}
              columns={columnPrefs}
              sortBy={filters.sort_by}
              sortDir={filters.sort_dir}
              onSort={toggleSort}
              selectedIds={selectedIds}
              onToggleSelected={toggleSelected}
              onToggleAll={toggleAll}
              density={density}
              onView={setDetailId}
              onCopyId={copyRecordId}
            />
            <HistoryPagination
              page={filters.page}
              totalPages={totalPages}
              total={total}
              pageSize={PAGE_SIZE}
              onPrev={() => updateFilter({ page: Math.max(0, filters.page - 1) }, false)}
              onNext={() => updateFilter({ page: Math.min(totalPages - 1, filters.page + 1) }, false)}
            />
          </>
        )}
      </div>

      <ConfirmDialog
        open={!!confirmDelete}
        title={confirmDelete?.bulk ? 'Delete selected records?' : 'Delete this record?'}
        description="This action cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (confirmDelete?.bulk) bulkDeleteMutation.mutate(confirmDelete.ids);
          else if (confirmDelete?.recordId) deleteMutation.mutate(confirmDelete.recordId);
        }}
        onCancel={() => setConfirmDelete(null)}
      />

      {detailId && (
        <HistoryDetailDrawer
          recordId={detailId}
          isAdmin={isAdmin}
          onClose={() => setDetailId(null)}
          onDelete={(id) => setConfirmDelete({ recordId: id })}
        />
      )}

      <HistoryComparisonModal
        records={compareRecords.slice(0, 3)}
        open={showCompare}
        onClose={() => setShowCompare(false)}
      />
    </div>
  );
}

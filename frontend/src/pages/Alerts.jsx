import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { AlertCircle, Bell, X } from 'lucide-react';

import api from '../api/client';
import { getOptions } from '../api/endpoints';
import { usePageTitle } from '../hooks/usePageTitle';
import { useAlertsFilters } from '../hooks/useAlertsFilters';
import { useAlertStream } from '../hooks/useAlertStream';
import { useBrowserNotifications } from '../hooks/useBrowserNotifications';
import { STORAGE_ALERTS_DENSITY, loadDensity } from '../lib/alertsConfig';

import EmptyState from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
import CriticalAlertBanner from '../components/alerts/CriticalAlertBanner';
import AlertsPageHeader from '../components/alerts/AlertsPageHeader';
import AlertsStats, { LiveIndicator } from '../components/alerts/AlertsStats';
import AlertsFilterBar from '../components/alerts/AlertsFilterBar';
import AlertsAdvancedFilters from '../components/alerts/AlertsAdvancedFilters';
import AlertsBulkActions from '../components/alerts/AlertsBulkActions';
import AlertsList from '../components/alerts/AlertsList';
import AlertsDetailDrawer from '../components/alerts/AlertsDetailDrawer';

const NEW_HIGHLIGHT_MS = 30_000;

export default function Alerts() {
  usePageTitle('Alerts');
  const qc = useQueryClient();

  const {
    filters,
    searchInput,
    setSearchInput,
    updateFilter,
    resetFilters,
    queryParams,
    hasActiveFilters,
  } = useAlertsFilters();

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [density, setDensity] = useState(loadDensity);
  const [selectedIds, setSelectedIds] = useState([]);
  const [detailId, setDetailId] = useState(null);
  const [newIds, setNewIds] = useState(() => new Set());
  const [bannerCount, setBannerCount] = useState(0);
  const searchRef = useRef(null);
  const lastSeenIdsRef = useRef(null);

  const { permission, requestPermission, dismissPrompt, notify, showPrompt } = useBrowserNotifications();

  useEffect(() => {
    localStorage.setItem(STORAGE_ALERTS_DENSITY, density);
  }, [density]);

  const { data: options } = useQuery({
    queryKey: ['alerts-options'],
    queryFn: getOptions,
    staleTime: 10 * 60 * 1000,
  });

  const { data: stats } = useQuery({
    queryKey: ['alerts-stats'],
    queryFn: () => api.getAlertStats(),
    staleTime: 15_000,
  });

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['alerts', queryParams],
    queryFn: () => api.getAlerts(queryParams),
    staleTime: 15_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  const alerts = useMemo(() => {
    const list = Array.isArray(data) ? data : data?.records ?? [];
    let out = list;
    if (filters.start_date) {
      const from = new Date(filters.start_date).getTime();
      out = out.filter((a) => new Date(a.timestamp).getTime() >= from);
    }
    if (filters.end_date) {
      const to = new Date(filters.end_date).getTime() + 86400000;
      out = out.filter((a) => new Date(a.timestamp).getTime() <= to);
    }
    return out;
  }, [data, filters.start_date, filters.end_date]);

  // Detect new alerts on each data change
  useEffect(() => {
    const currentIds = new Set(alerts.map((a) => a.id));
    if (lastSeenIdsRef.current === null) {
      lastSeenIdsRef.current = currentIds;
      return;
    }
    const prev = lastSeenIdsRef.current;
    const fresh = new Set();
    for (const id of currentIds) {
      if (!prev.has(id)) fresh.add(id);
    }
    if (fresh.size > 0) {
      setNewIds((existing) => {
        const merged = new Set(existing);
        for (const id of fresh) merged.add(id);
        return merged;
      });
      setBannerCount(fresh.size);
    }
    lastSeenIdsRef.current = currentIds;
  }, [alerts]);

  // Clear highlights after 30s
  useEffect(() => {
    if (newIds.size === 0) return;
    const t = setTimeout(() => setNewIds(new Set()), NEW_HIGHLIGHT_MS);
    return () => clearTimeout(t);
  }, [newIds]);

  // Real-time stream — invalidate queries when the backend emits
  const { connected } = useAlertStream({
    onAlert: useCallback(
      (payload) => {
        qc.invalidateQueries({ queryKey: ['alerts'] });
        qc.invalidateQueries({ queryKey: ['alerts-stats'] });

        const pathogen = payload?.pathogen_code?.toUpperCase() || 'Isolate';
        const county = payload?.county || 'unknown county';
        const isCritical = payload?.anomaly_detected && payload?.mdr_probability >= 0.85;

        notify(`${isCritical ? 'CRITICAL alert' : 'New alert'} — ${pathogen}`, {
          body: `${county} · ${isCritical ? 'High MDR probability' : 'Unusual pattern'}`,
          tag: 'amr-alert',
          requireInteraction: isCritical,
        });

        if (isCritical) {
          toast.error(`${pathogen} in ${county} — critical alert`, { duration: 6000 });
        }
      },
      [notify, qc],
    ),
  });

  const bulkMutation = useMutation({
    mutationFn: (ids) => api.bulkAcknowledgeAlerts(ids),
    onSuccess: (res) => {
      toast.success(`${res.acknowledged} alert${res.acknowledged === 1 ? '' : 's'} acknowledged`);
      qc.invalidateQueries({ queryKey: ['alerts'] });
      qc.invalidateQueries({ queryKey: ['alerts-stats'] });
      setSelectedIds([]);
    },
    onError: () => toast.error('Bulk acknowledge failed'),
  });

  const toggleSelected = useCallback((id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  const toggleAll = useCallback(() => {
    setSelectedIds((prev) =>
      prev.length === alerts.length ? [] : alerts.map((a) => a.id),
    );
  }, [alerts]);

  const exportCSV = () => {
    const headers = [
      'alert_id', 'timestamp', 'severity', 'type', 'pathogen', 'county',
      'sub_county', 'sector', 'mdr_probability', 'anomaly_score',
      'acknowledged', 'resolved', 'assigned_to', 'message',
    ];
    const rows = alerts.map((a) => [
      a.id, a.timestamp, a.severity, a.type, a.pathogen_code, a.county,
      a.sub_county, a.sector, a.mdr_probability, a.anomaly_score,
      a.acknowledged, a.resolved, a.assigned_to, a.message,
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `alerts_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Exported');
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || document.activeElement?.isContentEditable) return;

      if (e.key === '/') {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key === 'r') {
        e.preventDefault();
        refetch();
      } else if (e.key === 'e') {
        e.preventDefault();
        exportCSV();
      } else if (e.key === 'c' && selectedIds.length >= 1) {
        e.preventDefault();
        bulkMutation.mutate(selectedIds);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIds, refetch]);

  const detailAlert = useMemo(
    () => alerts.find((a) => a.id === detailId) || null,
    [alerts, detailId],
  );

  const criticalAlerts = alerts.filter((a) => a.severity === 'critical' && !a.resolved);
  const hasNewHighlights = newIds.size > 0;

  return (
    <div className="space-y-5">
      {criticalAlerts.length > 0 && <CriticalAlertBanner alerts={criticalAlerts} />}

      {bannerCount > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-[var(--radius-card)] bg-[var(--status-info-bg)] border border-[var(--status-info-border)]">
          <Bell className="w-4 h-4 text-[var(--status-info)] flex-shrink-0" />
          <p className="text-sm text-[var(--status-info)] flex-1">
            <strong>{bannerCount}</strong> new alert{bannerCount === 1 ? '' : 's'} since your last refresh
          </p>
          <button
            onClick={() => setBannerCount(0)}
            className="p-1 rounded text-[var(--status-info)] hover:bg-[var(--status-info-border)]/40 transition"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {showPrompt && (
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 rounded-[var(--radius-card)] bg-[var(--bg-secondary)] border border-[var(--border-primary)]">
          <Bell className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0" />
          <p className="text-sm text-[var(--text-secondary)] flex-1">
            Enable desktop notifications to be alerted about critical events even when this tab isn't focused.
          </p>
          <button
            onClick={requestPermission}
            className="text-sm px-3 py-1.5 rounded-[var(--radius-btn)] bg-[var(--accent-teal)] text-white hover:bg-[var(--accent-teal-hover)] transition"
          >
            Enable
          </button>
          <button
            onClick={dismissPrompt}
            className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            Not now
          </button>
        </div>
      )}

      <AlertsPageHeader
        onRefresh={() => refetch()}
        isFetching={isFetching}
        onExport={exportCSV}
        alertCount={alerts.length}
      />

      <div className="flex items-center justify-between">
        <AlertsStats stats={stats} hasNew={hasNewHighlights} connected={connected} />
      </div>

      <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
        <LiveIndicator connected={connected} />
        <span>
          {permission === 'granted'
            ? 'Desktop notifications enabled'
            : permission === 'denied'
              ? 'Desktop notifications blocked'
              : 'Desktop notifications off'}
        </span>
      </div>

      <AlertsFilterBar
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
      />

      {showAdvanced && (
        <AlertsAdvancedFilters
          filters={filters}
          onChange={updateFilter}
          options={options}
        />
      )}

      <AlertsBulkActions
        count={selectedIds.length}
        onClear={() => setSelectedIds([])}
        onAcknowledge={() => bulkMutation.mutate(selectedIds)}
        loading={bulkMutation.isPending}
      />

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 rounded-[var(--radius-card)]" />
          ))}
        </div>
      ) : isError ? (
        <EmptyState
          icon={AlertCircle}
          title="Could not load alerts"
          description={error?.message || 'Try again in a moment.'}
        />
      ) : alerts.length === 0 ? (
        <EmptyState
          icon={AlertCircle}
          title={
            hasActiveFilters
              ? 'No alerts match your filters'
              : 'No alerts — system is stable'
          }
          description={
            hasActiveFilters
              ? 'Try adjusting your filters or switching to the All tab.'
              : 'Anomalies and high MDR isolates will appear here when detected.'
          }
        />
      ) : (
        <AlertsList
          alerts={alerts}
          selectedIds={selectedIds}
          newIds={newIds}
          onToggleSelected={toggleSelected}
          onToggleAll={toggleAll}
          density={density}
          onView={setDetailId}
        />
      )}

      {detailAlert && (
        <AlertsDetailDrawer
          alert={detailAlert}
          onClose={() => setDetailId(null)}
        />
      )}
    </div>
  );
}

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { PlusIcon, TrashIcon, ArrowDownTrayIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import api from '../api/client';
import { Skeleton } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { usePageTitle } from '../hooks/usePageTitle';
import { formatNumber } from '../lib/format';

const MAPPING_TYPES = [
  { value: 'specimen', label: 'Specimen' },
  { value: 'sector', label: 'Sector' },
  { value: 'antibiotic_class', label: 'Antibiotic class' },
];

function defaultWindow() {
  const end = new Date();
  const start = new Date(end.getFullYear() - 1, end.getMonth(), end.getDate());
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

function AddMappingForm({ onDone }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    mapping_type: 'specimen',
    raw_value: '',
    glass_code: '',
    glass_label: '',
  });

  const mutation = useMutation({
    mutationFn: (data) => api.createGlassMapping(data),
    onSuccess: () => {
      toast.success('Mapping added');
      qc.invalidateQueries({ queryKey: ['glass-mappings'] });
      qc.invalidateQueries({ queryKey: ['glass-unmapped'] });
      setForm({ mapping_type: 'specimen', raw_value: '', glass_code: '', glass_label: '' });
      onDone?.();
    },
    onError: (e) => toast.error(e.message || 'Failed to add mapping'),
  });

  const submit = (e) => {
    e.preventDefault();
    if (!form.raw_value.trim() || !form.glass_code.trim()) {
      toast.error('raw_value and glass_code are required');
      return;
    }
    mutation.mutate({
      mapping_type: form.mapping_type,
      raw_value: form.raw_value.trim(),
      glass_code: form.glass_code.trim(),
      glass_label: form.glass_label.trim() || null,
    });
  };

  return (
    <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-end">
      <div>
        <label className="block text-xs text-[var(--text-muted)] mb-1">Type</label>
        <select
          value={form.mapping_type}
          onChange={(e) => setForm((f) => ({ ...f, mapping_type: e.target.value }))}
          className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--bg-primary)] border border-[var(--border-primary)]/40 text-[var(--text-primary)]"
        >
          {MAPPING_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs text-[var(--text-muted)] mb-1">Raw value</label>
        <input
          value={form.raw_value}
          onChange={(e) => setForm((f) => ({ ...f, raw_value: e.target.value }))}
          placeholder="e.g. Blood culture"
          className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--bg-primary)] border border-[var(--border-primary)]/40 text-[var(--text-primary)]"
        />
      </div>
      <div>
        <label className="block text-xs text-[var(--text-muted)] mb-1">GLASS code</label>
        <input
          value={form.glass_code}
          onChange={(e) => setForm((f) => ({ ...f, glass_code: e.target.value }))}
          placeholder="e.g. BLOOD"
          className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--bg-primary)] border border-[var(--border-primary)]/40 text-[var(--text-primary)]"
        />
      </div>
      <div>
        <label className="block text-xs text-[var(--text-muted)] mb-1">Label (optional)</label>
        <input
          value={form.glass_label}
          onChange={(e) => setForm((f) => ({ ...f, glass_label: e.target.value }))}
          className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--bg-primary)] border border-[var(--border-primary)]/40 text-[var(--text-primary)]"
        />
      </div>
      <button
        type="submit"
        disabled={mutation.isPending}
        className="inline-flex items-center justify-center gap-1 px-4 py-2 text-sm rounded-lg bg-[var(--accent-teal)] text-white hover:opacity-90 disabled:opacity-50"
      >
        <PlusIcon className="w-4 h-4" />
        Add
      </button>
    </form>
  );
}

export default function AdminGlass() {
  usePageTitle('GLASS Reference');
  const qc = useQueryClient();
  const [window_, setWindow] = useState(defaultWindow);
  const [filterType, setFilterType] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);

  const unmappedQuery = useQuery({
    queryKey: ['glass-unmapped', window_],
    queryFn: () => api.getGlassUnmapped(`start=${window_.start}&end=${window_.end}`),
    staleTime: 30_000,
  });

  const mappingsQuery = useQuery({
    queryKey: ['glass-mappings', filterType],
    queryFn: () => api.getGlassMappings(filterType ? `mapping_type=${filterType}` : ''),
    staleTime: 30_000,
  });

  const exportQuery = useQuery({
    queryKey: ['glass-export', window_],
    queryFn: () => api.getGlassExport(`start=${window_.start}&end=${window_.end}`),
    staleTime: 30_000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.deleteGlassMapping(id),
    onSuccess: () => {
      toast.success('Mapping deleted');
      qc.invalidateQueries({ queryKey: ['glass-mappings'] });
      qc.invalidateQueries({ queryKey: ['glass-unmapped'] });
      setConfirmDelete(null);
    },
    onError: (e) => toast.error(e.message || 'Delete failed'),
  });

  const exportBlob = () => {
    const data = exportQuery.data;
    if (!data?.csv) return;
    const blob = new Blob([data.csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `glass_export_${window_.start}_${window_.end}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const unmapped = useMemo(
    () => unmappedQuery.data?.unmapped ?? {},
    [unmappedQuery.data],
  );
  const mappings = mappingsQuery.data ?? [];
  const totalUnmapped = useMemo(
    () => Object.values(unmapped).reduce((n, arr) => n + arr.length, 0),
    [unmapped],
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">GLASS Reference</h1>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">
          Reference mappings that translate platform values into GLASS submission codes.
          Coverage must be 100% before a submission is sent.
        </p>
      </div>

      <div className="rounded-2xl border border-[var(--border-primary)]/40 bg-[var(--bg-secondary)]/80 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1">Start</label>
            <input
              type="date"
              value={window_.start}
              onChange={(e) => setWindow((w) => ({ ...w, start: e.target.value }))}
              className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--bg-primary)] border border-[var(--border-primary)]/40 text-[var(--text-primary)]"
            />
          </div>
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1">End</label>
            <input
              type="date"
              value={window_.end}
              onChange={(e) => setWindow((w) => ({ ...w, end: e.target.value }))}
              className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--bg-primary)] border border-[var(--border-primary)]/40 text-[var(--text-primary)]"
            />
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <button
              onClick={exportBlob}
              disabled={!exportQuery.data?.csv}
              className="inline-flex items-center gap-1 px-4 py-2 text-sm rounded-lg bg-[var(--bg-tertiary)] text-[var(--text-primary)] hover:opacity-90 disabled:opacity-50"
            >
              <ArrowDownTrayIcon className="w-4 h-4" />
              Download CSV
            </button>
          </div>
        </div>
        {exportQuery.data?.summary && (
          <div className="mt-4 pt-3 border-t border-[var(--border-primary)]/40 grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
            <div>
              <div className="text-[var(--text-muted)]">Total isolates</div>
              <div className="tabular-nums font-semibold text-[var(--text-primary)]">
                {formatNumber(exportQuery.data.summary.total_isolates)}
              </div>
            </div>
            <div>
              <div className="text-[var(--text-muted)]">Mapped</div>
              <div className="tabular-nums font-semibold text-[var(--text-primary)]">
                {formatNumber(exportQuery.data.summary.mapped_isolates)}
              </div>
            </div>
            <div>
              <div className="text-[var(--text-muted)]">Exported rows</div>
              <div className="tabular-nums font-semibold text-[var(--text-primary)]">
                {formatNumber(exportQuery.data.summary.exported_rows)}
              </div>
            </div>
            <div>
              <div className="text-[var(--text-muted)]">Coverage</div>
              <div className={`tabular-nums font-semibold ${
                exportQuery.data.summary.coverage_pct >= 100
                  ? 'text-[var(--status-success)]'
                  : 'text-[var(--status-warning)]'
              }`}>
                {exportQuery.data.summary.coverage_pct}%
              </div>
            </div>
            <div>
              <div className="text-[var(--text-muted)]">Unclassified</div>
              <div className="tabular-nums font-semibold text-[var(--text-primary)]">
                {formatNumber(exportQuery.data.unclassified_isolates ?? 0)}
              </div>
            </div>
          </div>
        )}
      </div>

      {totalUnmapped > 0 && (
        <div className="rounded-2xl border border-[var(--status-warning)]/40 bg-[var(--status-warning-bg)]/30 p-4">
          <div className="flex items-start gap-2 mb-3">
            <ExclamationTriangleIcon className="w-5 h-5 text-[var(--status-warning)] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                {totalUnmapped} unmapped value{totalUnmapped === 1 ? '' : 's'} in this window
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                These isolates will be dropped from GLASS export. Add a mapping below.
              </p>
            </div>
          </div>
          <div className="space-y-2">
            {Object.entries(unmapped).map(([type, values]) =>
              values.length === 0 ? null : (
                <div key={type}>
                  <p className="text-xs font-medium text-[var(--text-secondary)] mb-1 capitalize">
                    {type.replace('_', ' ')}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {values.map((v) => (
                      <span
                        key={v.raw_value}
                        className="text-xs px-2 py-0.5 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-secondary)]"
                      >
                        {v.raw_value} · {formatNumber(v.isolate_count)}
                      </span>
                    ))}
                  </div>
                </div>
              ),
            )}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-[var(--border-primary)]/40 bg-[var(--bg-secondary)]/80 p-4">
        <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Add mapping</h2>
        <AddMappingForm />
      </div>

      <div className="rounded-2xl border border-[var(--border-primary)]/40 bg-[var(--bg-secondary)]/80 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            Mappings · {mappings.length}
          </h2>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-1.5 text-sm rounded-lg bg-[var(--bg-primary)] border border-[var(--border-primary)]/40 text-[var(--text-primary)]"
          >
            <option value="">All types</option>
            {MAPPING_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        {mappingsQuery.isLoading ? (
          <Skeleton className="h-40" />
        ) : mappings.length === 0 ? (
          <EmptyState title="No mappings" description="Add one above." />
        ) : (
          <div className="overflow-hidden rounded-xl border border-[var(--border-primary)]/40">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-[var(--border-primary)]/40 bg-[var(--bg-primary)]/40">
                  <th className="px-3 py-2 font-medium text-[var(--text-muted)]">Type</th>
                  <th className="px-3 py-2 font-medium text-[var(--text-muted)]">Raw value</th>
                  <th className="px-3 py-2 font-medium text-[var(--text-muted)]">GLASS code</th>
                  <th className="px-3 py-2 font-medium text-[var(--text-muted)]">Label</th>
                  <th className="px-3 py-2 font-medium text-[var(--text-muted)] text-right">Order</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {mappings.map((m) => (
                  <tr key={m.id} className="border-b border-[var(--border-primary)]/20">
                    <td className="px-3 py-2 text-[var(--text-secondary)] capitalize">
                      {m.mapping_type.replace('_', ' ')}
                    </td>
                    <td className="px-3 py-2 text-[var(--text-primary)] font-mono text-xs">
                      {m.raw_value}
                    </td>
                    <td className="px-3 py-2 text-[var(--text-primary)] font-mono text-xs">
                      {m.glass_code}
                    </td>
                    <td className="px-3 py-2 text-[var(--text-secondary)]">
                      {m.glass_label || '—'}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-[var(--text-muted)]">
                      {m.display_order}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={() => setConfirmDelete(m)}
                        className="text-[var(--status-critical)] hover:opacity-80"
                        title="Delete mapping"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete mapping?"
        message={
          confirmDelete
            ? `${confirmDelete.mapping_type}: ${confirmDelete.raw_value} → ${confirmDelete.glass_code}`
            : ''
        }
        confirmLabel="Delete"
        onConfirm={() => confirmDelete && deleteMutation.mutate(confirmDelete.id)}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
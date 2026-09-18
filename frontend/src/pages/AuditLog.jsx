import { useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import {
  Shield, Search, X, Filter, Download, RefreshCw, Activity,
  Calendar, User as UserIcon, ChevronLeft, ChevronRight,
} from 'lucide-react';

import { getAuditEvents, getAuditStats, getAuditMeta, exportAuditCSV } from '../api/endpoints';
import { usePageTitle } from '../hooks/usePageTitle';
import { useAuditFilters } from '../hooks/useAuditFilters';
import { useAuth } from '../contexts/AuthContext';
import EmptyState from '../components/ui/EmptyState';
import { SkeletonTable } from '../components/ui/Skeleton';
import { formatNumber, formatDateTime, timeAgo } from '../lib/format';

const PAGE_SIZE = 50;

const ACTION_TONE = {
  create: 'bg-[var(--status-success-bg)] text-[var(--status-success)] border-[var(--status-success-border)]',
  update: 'bg-[var(--status-info-bg)] text-[var(--status-info)] border-[var(--status-info-border)]',
  delete: 'bg-[var(--status-critical-bg)] text-[var(--status-critical)] border-[var(--status-critical-border)]',
  export: 'bg-[var(--status-warning-bg)] text-[var(--status-warning)] border-[var(--status-warning-border)]',
  login: 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border-[var(--border-primary)]',
  other: 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] border-[var(--border-primary)]',
};

const RESULT_TONE = {
  success: 'text-[var(--status-success)]',
  denied: 'text-[var(--status-critical)]',
  error: 'text-[var(--status-critical)]',
  client_error: 'text-[var(--status-warning)]',
};

export default function AuditLog() {
  usePageTitle('Audit Log');
  const { user } = useAuth();
  const {
    filters, searchInput, setSearchInput, updateFilter, resetFilters, queryParams, hasActiveFilters,
  } = useAuditFilters();
  const searchRef = useRef(null);
  const [exporting, setExporting] = useState(false);

  const isAdmin = user?.role === 'admin';

  const { data: stats } = useQuery({
    queryKey: ['audit-stats'],
    queryFn: getAuditStats,
    enabled: isAdmin,
    staleTime: 30_000,
  });

  const { data: meta } = useQuery({
    queryKey: ['audit-meta'],
    queryFn: getAuditMeta,
    enabled: isAdmin,
    staleTime: 5 * 60 * 1000,
  });

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['audit-events', queryParams, filters.page],
    queryFn: () => {
      const params = new URLSearchParams(queryParams);
      params.set('limit', String(PAGE_SIZE));
      params.set('skip', String(filters.page * PAGE_SIZE));
      return getAuditEvents(params.toString());
    },
    enabled: isAdmin,
    staleTime: 30_000,
  });

  const events = data?.records ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleExport = async () => {
    setExporting(true);
    try {
      const token = localStorage.getItem('amr-nexus-token');
      const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const res = await fetch(`${base}/audit/export?${queryParams}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `audit_events_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success('Audit log exported');
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  if (!isAdmin) {
    return (
      <EmptyState
        icon={Shield}
        title="Administrator access required"
        description="You do not have permission to view the audit log."
      />
    );
  }

  const actions = meta?.actions || [];
  const resources = meta?.resources || [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Audit Log</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            Every privileged action across the platform, retained for compliance
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-btn)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] text-sm font-medium hover:bg-[var(--bg-tertiary)] transition disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-btn)] bg-[var(--accent-teal)] hover:bg-[var(--accent-teal-hover)] text-white text-sm font-medium transition disabled:opacity-60"
          >
            <Download className="w-4 h-4" />
            {exporting ? 'Exporting...' : 'Export CSV'}
          </button>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Activity} label="Total events" value={formatNumber(stats.total)} />
          <StatCard icon={Calendar} label="Last 24 hours" value={formatNumber(stats.last_24h)} />
          <StatCard icon={UserIcon} label="Active users (7d)" value={formatNumber(stats.distinct_actors_7d)} />
          <StatCard
            icon={Shield}
            label="Denied (7d)"
            value={formatNumber(stats.denied_last_7d)}
            tone={stats.denied_last_7d > 0 ? 'critical' : 'default'}
          />
        </div>
      )}

      <div className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-4 space-y-3">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Search path, resource ID, or actor email..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full rounded-[var(--radius-input)] border border-[var(--border-primary)] bg-[var(--bg-primary)] pl-9 pr-9 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-teal)]"
            />
            {searchInput && (
              <button
                onClick={() => setSearchInput('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <input
            type="text"
            value={filters.actor}
            onChange={(e) => updateFilter({ actor: e.target.value })}
            placeholder="Actor email"
            className="rounded-[var(--radius-input)] border border-[var(--border-primary)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)] w-48"
          />

          <select
            value={filters.action}
            onChange={(e) => updateFilter({ action: e.target.value })}
            className="rounded-[var(--radius-input)] border border-[var(--border-primary)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)]"
          >
            <option value="all">All actions</option>
            {actions.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>

          <select
            value={filters.resource}
            onChange={(e) => updateFilter({ resource: e.target.value })}
            className="rounded-[var(--radius-input)] border border-[var(--border-primary)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)]"
          >
            <option value="all">All resources</option>
            {resources.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>

          <select
            value={filters.result}
            onChange={(e) => updateFilter({ result: e.target.value })}
            className="rounded-[var(--radius-input)] border border-[var(--border-primary)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)]"
          >
            <option value="all">All results</option>
            <option value="success">Success</option>
            <option value="denied">Denied</option>
            <option value="error">Error</option>
          </select>

          <input
            type="date"
            value={filters.start_date}
            onChange={(e) => updateFilter({ start_date: e.target.value })}
            className="rounded-[var(--radius-input)] border border-[var(--border-primary)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)]"
          />

          <input
            type="date"
            value={filters.end_date}
            onChange={(e) => updateFilter({ end_date: e.target.value })}
            className="rounded-[var(--radius-input)] border border-[var(--border-primary)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)]"
          />

          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="text-sm text-[var(--text-muted)] hover:text-[var(--status-critical)] transition"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      <div className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] overflow-hidden">
        {isLoading ? (
          <div className="p-5"><SkeletonTable rows={8} cols={5} /></div>
        ) : isError ? (
          <EmptyState
            icon={Shield}
            title="Could not load audit events"
            description={error?.message || 'Try again in a moment.'}
          />
        ) : events.length === 0 ? (
          <EmptyState
            icon={Shield}
            title="No audit events match"
            description={hasActiveFilters ? 'Try adjusting your filters.' : 'Nothing has been logged yet.'}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-[var(--bg-tertiary)] border-b border-[var(--border-primary)]">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)]">When</th>
                    <th className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)]">Actor</th>
                    <th className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)]">Action</th>
                    <th className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)]">Resource</th>
                    <th className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)]">Path</th>
                    <th className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)]">Result</th>
                    <th className="px-3 py-2 text-left font-semibold text-[var(--text-secondary)]">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-primary)]">
                  {events.map((e) => (
                    <tr key={e.id} className="hover:bg-[var(--bg-tertiary)]/40 transition">
                      <td className="px-3 py-2 text-xs text-[var(--text-muted)] whitespace-nowrap" title={formatDateTime(e.occurred_at)}>
                        {timeAgo(e.occurred_at)}
                      </td>
                      <td className="px-3 py-2 text-[var(--text-secondary)]">
                        {e.actor_email || <span className="italic text-[var(--text-muted)]">anonymous</span>}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${ACTION_TONE[e.action] || ACTION_TONE.other}`}>
                          {e.action}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-[var(--text-secondary)] capitalize">
                        {e.resource}
                        {e.resource_id && (
                          <span className="ml-1 text-[10px] font-mono text-[var(--text-muted)]">
                            {String(e.resource_id).slice(0, 8)}...
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs font-mono text-[var(--text-muted)] truncate max-w-xs">
                        {e.method} {e.path}
                      </td>
                      <td className={`px-3 py-2 text-xs font-semibold ${RESULT_TONE[e.result] || 'text-[var(--text-muted)]'}`}>
                        {e.status_code} {e.result}
                      </td>
                      <td className="px-3 py-2 text-xs font-mono text-[var(--text-muted)]">
                        {e.ip_address || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border-primary)] text-sm">
              <span className="text-[var(--text-muted)]">
                Showing {filters.page * PAGE_SIZE + 1}-{Math.min((filters.page + 1) * PAGE_SIZE, total)} of {formatNumber(total)}
              </span>
              <div className="flex gap-2 items-center">
                <button
                  onClick={() => updateFilter({ page: Math.max(0, filters.page - 1) }, false)}
                  disabled={filters.page === 0}
                  className="p-1.5 rounded border border-[var(--border-primary)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] disabled:opacity-50 hover:bg-[var(--bg-tertiary)]"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 text-[var(--text-muted)] text-xs">
                  Page {filters.page + 1} of {totalPages}
                </span>
                <button
                  onClick={() => updateFilter({ page: Math.min(totalPages - 1, filters.page + 1) }, false)}
                  disabled={filters.page >= totalPages - 1}
                  className="p-1.5 rounded border border-[var(--border-primary)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] disabled:opacity-50 hover:bg-[var(--bg-tertiary)]"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, tone = 'default' }) {
  const toneClass = {
    default: 'text-[var(--text-primary)]',
    critical: 'text-[var(--status-critical)]',
  }[tone];

  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-[var(--radius-card)] p-4 shadow-[var(--shadow-sm)]">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">{label}</p>
        <Icon className="w-4 h-4 text-[var(--text-muted)]" />
      </div>
      <p className={`text-2xl font-bold tabular-nums ${toneClass}`}>{value}</p>
    </div>
  );
}

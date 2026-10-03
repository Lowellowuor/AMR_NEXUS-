import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RefreshCw, Activity, Clock } from 'lucide-react';
import { usePageTitle } from '../hooks/usePageTitle';
import api from '../api/client';
import { Skeleton } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import { formatDateTime, timeAgo } from '../lib/format';

const ACTION_STYLE = {
  create: 'bg-[var(--status-success-bg)] text-[var(--status-success)]',
  update: 'bg-[var(--status-info-bg)] text-[var(--status-info)]',
  delete: 'bg-[var(--status-critical-bg)] text-[var(--status-critical)]',
  login: 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]',
  export: 'bg-[var(--status-warning-bg)] text-[var(--status-warning)]',
};

const RESULT_STYLE = {
  success: 'text-[var(--status-success)]',
  denied: 'text-[var(--status-critical)]',
  error: 'text-[var(--status-critical)]',
  client_error: 'text-[var(--status-warning)]',
};

export default function ActivityLog() {
  usePageTitle('My Activity');
  const [limit, setLimit] = useState(100);

  const query = useQuery({
    queryKey: ['my-activity', limit],
    queryFn: () => api.getMyActivity(limit),
    staleTime: 30_000,
  });

  const events = query.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Activity className="h-6 w-6 text-[var(--accent-teal)]" />
            My Activity
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Your own record of actions on the platform. Data Protection Act
            2019 right to access.
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={limit}
            onChange={(e) => setLimit(parseInt(e.target.value, 10))}
            className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-full px-4 py-2 text-sm"
          >
            <option value={50}>Last 50</option>
            <option value={100}>Last 100</option>
            <option value={250}>Last 250</option>
            <option value={500}>Last 500</option>
          </select>
          <button
            type="button"
            onClick={() => query.refetch()}
            disabled={query.isFetching}
            className="flex items-center gap-2 px-4 py-2 rounded-full border border-[var(--border-primary)] text-sm hover:bg-[var(--bg-tertiary)]/60 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${query.isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="bg-[var(--bg-secondary)]/80 rounded-2xl overflow-hidden">
        {query.isLoading ? (
          <div className="p-5"><Skeleton className="h-40" /></div>
        ) : events.length === 0 ? (
          <EmptyState
            title="No activity recorded yet"
            description="Actions you take on the platform will appear here."
            icon={Clock}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--bg-tertiary)]/40">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-[var(--text-muted)]">When</th>
                  <th className="text-left px-4 py-3 font-medium text-[var(--text-muted)]">Action</th>
                  <th className="text-left px-4 py-3 font-medium text-[var(--text-muted)]">Resource</th>
                  <th className="text-left px-4 py-3 font-medium text-[var(--text-muted)]">Method</th>
                  <th className="text-left px-4 py-3 font-medium text-[var(--text-muted)]">Result</th>
                  <th className="text-left px-4 py-3 font-medium text-[var(--text-muted)]">IP</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.id} className="border-t border-[var(--border-primary)]/40 hover:bg-[var(--bg-tertiary)]/20">
                    <td className="px-4 py-3 text-[var(--text-secondary)] text-xs whitespace-nowrap" title={formatDateTime(e.occurred_at)}>
                      {timeAgo(e.occurred_at)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${ACTION_STYLE[e.action] || 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'}`}>
                        {e.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[var(--text-secondary)] text-xs">
                      {e.resource || '—'}
                      {e.resource_id ? <span className="text-[var(--text-muted)]"> · {e.resource_id.slice(0, 8)}</span> : null}
                    </td>
                    <td className="px-4 py-3 text-[var(--text-muted)] text-xs font-mono">
                      {e.method || '—'}
                    </td>
                    <td className={`px-4 py-3 text-xs font-medium ${RESULT_STYLE[e.result] || 'text-[var(--text-secondary)]'}`}>
                      {e.result || '—'}
                      {e.status_code ? <span className="text-[var(--text-muted)]"> ({e.status_code})</span> : null}
                    </td>
                    <td className="px-4 py-3 text-[var(--text-muted)] text-xs font-mono">
                      {e.ip_address || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-[var(--text-muted)]">
        Showing up to {limit} of your most recent events. For a full export of
        all your data, use Settings → Privacy → Download my data.
      </p>
    </div>
  );
}
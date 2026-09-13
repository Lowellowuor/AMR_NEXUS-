import { useQuery } from '@tanstack/react-query';
import { Activity, Shield } from 'lucide-react';
import api from '../../api/client';
import { formatDateTime, timeAgo } from '../../lib/format';
import EmptyState from '../ui/EmptyState';
import { SkeletonTable } from '../ui/Skeleton';

const ACTION_TONE = {
  create: 'bg-[var(--status-success-bg)] text-[var(--status-success)] border-[var(--status-success-border)]',
  update: 'bg-[var(--status-info-bg)] text-[var(--status-info)] border-[var(--status-info-border)]',
  delete: 'bg-[var(--status-critical-bg)] text-[var(--status-critical)] border-[var(--status-critical-border)]',
  export: 'bg-[var(--status-warning-bg)] text-[var(--status-warning)] border-[var(--status-warning-border)]',
  login: 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border-[var(--border-primary)]',
  delete_request: 'bg-[var(--status-critical-bg)] text-[var(--status-critical)] border-[var(--status-critical-border)]',
};

export default function ActivitySection() {
  const { data, isLoading } = useQuery({
    queryKey: ['my-activity'],
    queryFn: () => api.getMyActivity(200),
    staleTime: 60_000,
  });

  const events = data || [];

  return (
    <div className="space-y-5">
      <div className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-5">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2 flex items-center gap-2">
          <Activity className="w-4 h-4 text-[var(--accent-teal)]" />
          My activity
        </h3>
        <p className="text-xs text-[var(--text-muted)] mb-4 leading-relaxed">
          Every action you take on the platform is logged. This is your personal audit trail.
        </p>
        {isLoading ? (
          <SkeletonTable rows={6} cols={4} />
        ) : events.length === 0 ? (
          <EmptyState icon={Shield} title="No activity yet" description="Actions you take will appear here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-[var(--border-primary)]">
                <tr>
                  <th className="text-left py-2 font-semibold text-[var(--text-secondary)]">When</th>
                  <th className="text-left py-2 font-semibold text-[var(--text-secondary)]">Action</th>
                  <th className="text-left py-2 font-semibold text-[var(--text-secondary)]">Resource</th>
                  <th className="text-left py-2 font-semibold text-[var(--text-secondary)]">Path</th>
                  <th className="text-right py-2 font-semibold text-[var(--text-secondary)]">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-primary)]">
                {events.map((e) => (
                  <tr key={e.id} className="hover:bg-[var(--bg-tertiary)]/40">
                    <td className="py-2 text-xs text-[var(--text-muted)]" title={formatDateTime(e.occurred_at)}>
                      {timeAgo(e.occurred_at)}
                    </td>
                    <td className="py-2">
                      <span className={`inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${ACTION_TONE[e.action] || ACTION_TONE.login}`}>
                        {e.action}
                      </span>
                    </td>
                    <td className="py-2 text-[var(--text-secondary)] capitalize">{e.resource || '-'}</td>
                    <td className="py-2 text-xs font-mono text-[var(--text-muted)] truncate max-w-[240px]">
                      {e.method} {e.path}
                    </td>
                    <td className={`py-2 text-right text-xs font-semibold ${
                      e.result === 'success' ? 'text-[var(--status-success)]'
                        : e.result === 'denied' ? 'text-[var(--status-critical)]'
                        : 'text-[var(--text-muted)]'
                    }`}>
                      {e.status_code} {e.result}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

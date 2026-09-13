import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Mail, MessageSquare, Bell, RefreshCw, AlertCircle, CheckCircle2, Clock } from 'lucide-react';

import { getNotificationLog } from '../api/endpoints';
import { usePageTitle } from '../hooks/usePageTitle';
import { formatDateTime, timeAgo } from '../lib/format';
import EmptyState from '../components/ui/EmptyState';
import { SkeletonTable } from '../components/ui/Skeleton';

const CHANNELS = [
  { id: 'all', label: 'All channels' },
  { id: 'email', label: 'Email' },
  { id: 'sms', label: 'SMS' },
];

const STATUSES = [
  { id: 'all', label: 'All statuses' },
  { id: 'sent', label: 'Sent' },
  { id: 'queued', label: 'Queued' },
  { id: 'skipped', label: 'Skipped' },
  { id: 'error', label: 'Error' },
];

function ChannelIcon({ channel }) {
  if (channel === 'email') return <Mail className="w-3.5 h-3.5" />;
  if (channel === 'sms') return <MessageSquare className="w-3.5 h-3.5" />;
  return <Bell className="w-3.5 h-3.5" />;
}

function StatusBadge({ status }) {
  const map = {
    sent: 'bg-[var(--status-success-bg)] text-[var(--status-success)] border-[var(--status-success-border)]',
    queued: 'bg-[var(--status-info-bg)] text-[var(--status-info)] border-[var(--status-info-border)]',
    skipped: 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] border-[var(--border-primary)]',
    error: 'bg-[var(--status-critical-bg)] text-[var(--status-critical)] border-[var(--status-critical-border)]',
  };
  const icons = {
    sent: CheckCircle2,
    queued: Clock,
    skipped: AlertCircle,
    error: AlertCircle,
  };
  const Icon = icons[status] || Clock;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${map[status] || map.queued}`}>
      <Icon className="w-3 h-3" />
      {status}
    </span>
  );
}

export default function NotificationLog() {
  usePageTitle('Notification Log');
  const [channel, setChannel] = useState('all');
  const [status, setStatus] = useState('all');

  const params = new URLSearchParams();
  if (channel !== 'all') params.set('channel', channel);
  if (status !== 'all') params.set('status', status);
  const qs = params.toString();

  const { data: rows = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ['notification-log', qs],
    queryFn: () => getNotificationLog(qs),
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Bell className="w-5 h-5 text-[var(--accent-teal)]" />
            Notification Log
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            Every email and SMS the platform has attempted to deliver
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-btn)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] text-sm font-medium hover:bg-[var(--bg-tertiary)] transition disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          value={channel}
          onChange={(e) => setChannel(e.target.value)}
          className="rounded-[var(--radius-input)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] px-3 py-1.5 text-sm text-[var(--text-primary)]"
        >
          {CHANNELS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-[var(--radius-input)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] px-3 py-1.5 text-sm text-[var(--text-primary)]"
        >
          {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </div>

      <div className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] overflow-hidden">
        {isLoading ? (
          <div className="p-5"><SkeletonTable rows={8} cols={5} /></div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="No notifications yet"
            description="Alerts that trigger email or SMS will appear here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--bg-tertiary)] border-b border-[var(--border-primary)]">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-[var(--text-secondary)]">When</th>
                  <th className="text-left px-4 py-3 font-semibold text-[var(--text-secondary)]">Channel</th>
                  <th className="text-left px-4 py-3 font-semibold text-[var(--text-secondary)]">Recipient</th>
                  <th className="text-left px-4 py-3 font-semibold text-[var(--text-secondary)]">Subject</th>
                  <th className="text-left px-4 py-3 font-semibold text-[var(--text-secondary)]">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-primary)]">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-[var(--bg-tertiary)]/40">
                    <td className="px-4 py-2 text-xs text-[var(--text-muted)]" title={formatDateTime(r.created_at)}>
                      {timeAgo(r.created_at)}
                    </td>
                    <td className="px-4 py-2">
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--text-secondary)] capitalize">
                        <ChannelIcon channel={r.channel} />
                        {r.channel}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-xs text-[var(--text-secondary)]">
                      {r.recipient_email || r.recipient_phone || '—'}
                    </td>
                    <td className="px-4 py-2 text-[var(--text-primary)] truncate max-w-xs">
                      {r.subject || (r.body ? r.body.slice(0, 60) + (r.body.length > 60 ? '…' : '') : '—')}
                    </td>
                    <td className="px-4 py-2">
                      <StatusBadge status={r.status} />
                      {r.error && (
                        <p className="text-[10px] text-[var(--status-critical)] mt-0.5 truncate max-w-xs" title={r.error}>
                          {r.error}
                        </p>
                      )}
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

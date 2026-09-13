import { AlertTriangle, ShieldAlert, Bell, CheckCircle2, Radio } from 'lucide-react';
import { formatNumber } from '../../lib/format';

function StatCard({ icon: Icon, label, value, tone = 'default', pulse = false }) {
  const toneMap = {
    default: { text: 'text-[var(--text-primary)]', bg: 'bg-[var(--bg-tertiary)]', iconColor: 'text-[var(--text-muted)]' },
    critical: { text: 'text-[var(--status-critical)]', bg: 'bg-[var(--status-critical-bg)]', iconColor: 'text-[var(--status-critical)]' },
    warning: { text: 'text-[var(--status-warning)]', bg: 'bg-[var(--status-warning-bg)]', iconColor: 'text-[var(--status-warning)]' },
    success: { text: 'text-[var(--status-success)]', bg: 'bg-[var(--status-success-bg)]', iconColor: 'text-[var(--status-success)]' },
    info: { text: 'text-[var(--status-info)]', bg: 'bg-[var(--status-info-bg)]', iconColor: 'text-[var(--status-info)]' },
  }[tone];

  return (
    <div className="relative bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-[var(--radius-card)] p-4 shadow-[var(--shadow-sm)]">
      {pulse && (
        <span className="absolute top-3 right-3 flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent-teal)] opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--accent-teal)]" />
        </span>
      )}
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">{label}</p>
        <div className={`w-8 h-8 rounded-lg ${toneMap.bg} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${toneMap.iconColor}`} />
        </div>
      </div>
      <p className={`text-2xl font-bold tabular-nums ${toneMap.text}`}>{value}</p>
    </div>
  );
}

export default function AlertsStats({ stats, hasNew, connected }) {
  if (!stats) return null;
  const by = stats.by_severity || {};

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard icon={AlertTriangle} label="Critical" value={formatNumber(by.critical || 0)} tone="critical" />
      <StatCard icon={ShieldAlert} label="High" value={formatNumber(by.high || 0)} tone="warning" />
      <StatCard
        icon={Bell}
        label="Unacknowledged"
        value={formatNumber(stats.unacknowledged || 0)}
        tone="info"
        pulse={hasNew}
      />
      <StatCard icon={CheckCircle2} label="Resolved" value={formatNumber(stats.resolved || 0)} tone="success" />
    </div>
  );
}

export function LiveIndicator({ connected }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full border ${
        connected
          ? 'bg-[var(--status-success-bg)] text-[var(--status-success)] border-[var(--status-success-border)]'
          : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] border-[var(--border-primary)]'
      }`}
      title={connected ? 'Real-time stream connected' : 'Real-time stream disconnected'}
    >
      <Radio className="w-3 h-3" />
      {connected ? 'Live' : 'Offline'}
    </span>
  );
}

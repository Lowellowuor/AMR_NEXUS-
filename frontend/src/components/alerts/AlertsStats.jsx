import { AlertTriangle, ShieldAlert, Bell, CheckCircle2, Radio } from 'lucide-react';
import { formatNumber } from '../../lib/format';

function StatCard({ icon: Icon, label, value, hint, tone = 'default', pulse = false }) {
  const toneClass = {
    default: 'text-[var(--text-primary)]',
    critical: 'text-[var(--status-critical)]',
    warning: 'text-[var(--status-warning)]',
    success: 'text-[var(--status-success)]',
    info: 'text-[var(--status-info)]',
  }[tone];

  return (
    <div className="relative rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-5">
      {pulse && (
        <span className="absolute top-4 right-10 flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent-teal)] opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--accent-teal)]" />
        </span>
      )}
      <div className="flex items-start justify-between mb-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">{label}</p>
        {Icon && <Icon className="w-4 h-4 text-[var(--text-muted)]" />}
      </div>
      <p className={`text-2xl font-bold tabular-nums ${toneClass}`}>{value}</p>
      {hint && <p className="text-[10px] text-[var(--text-muted)] mt-1">{hint}</p>}
    </div>
  );
}

export default function AlertsStats({ stats, hasNew, connected }) {
  if (!stats) return null;
  const by = stats.by_severity || {};
  const total = stats.total || 0;
  const unresolved = total - (stats.resolved || 0);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        icon={AlertTriangle}
        label="Critical"
        value={formatNumber(by.critical || 0)}
        hint={unresolved > 0 ? `${formatNumber(unresolved)} unresolved in system` : 'all resolved'}
        tone="critical"
      />
      <StatCard
        icon={ShieldAlert}
        label="High"
        value={formatNumber(by.high || 0)}
        hint="needs triage"
        tone="warning"
      />
      <StatCard
        icon={Bell}
        label="Unacknowledged"
        value={formatNumber(stats.unacknowledged || 0)}
        hint="pending review"
        tone="info"
        pulse={hasNew}
      />
      <StatCard
        icon={CheckCircle2}
        label="Resolved"
        value={formatNumber(stats.resolved || 0)}
        hint={`of ${formatNumber(total)} total`}
        tone="success"
      />
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

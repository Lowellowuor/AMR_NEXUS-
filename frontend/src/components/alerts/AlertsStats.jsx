import { AlertTriangle, ShieldAlert, Bell, CheckCircle2, Radio } from 'lucide-react';
import { formatNumber } from '../../lib/format';

const TONES = {
  critical: 'text-[var(--status-critical)]',
  warning: 'text-[var(--status-warning)]',
  info: 'text-[var(--status-info)]',
  success: 'text-[var(--status-success)]',
  default: 'text-[var(--text-primary)]',
};

function StatCell({ icon: Icon, label, value, hint, tone = 'default' }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1">
        {Icon && <Icon className="w-3.5 h-3.5 text-[var(--text-muted)]" />}
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          {label}
        </p>
      </div>
      <p className={`text-2xl font-bold tabular-nums ${TONES[tone] || TONES.default}`}>
        {value}
      </p>
      {hint && (
        <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{hint}</p>
      )}
    </div>
  );
}

export default function AlertsStats({ stats, hasNew }) {
  if (!stats) return null;
  const by = stats.by_severity || {};
  const total = stats.total || 0;
  const unresolved = total - (stats.resolved || 0);

  return (
    <div className="rounded-2xl border border-[var(--border-primary)]/40 bg-[var(--bg-secondary)]/80 p-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCell
          icon={AlertTriangle}
          label="Critical"
          value={formatNumber(by.critical || 0)}
          hint={unresolved > 0 ? `${formatNumber(unresolved)} unresolved` : 'all resolved'}
          tone="critical"
        />
        <StatCell
          icon={ShieldAlert}
          label="High"
          value={formatNumber(by.high || 0)}
          hint="needs triage"
          tone="warning"
        />
        <StatCell
          icon={Bell}
          label="Unacknowledged"
          value={formatNumber(stats.unacknowledged || 0)}
          hint={hasNew ? 'new since last refresh' : 'pending review'}
          tone="info"
        />
        <StatCell
          icon={CheckCircle2}
          label="Resolved"
          value={formatNumber(stats.resolved || 0)}
          hint={`of ${formatNumber(total)} total`}
          tone="success"
        />
      </div>
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

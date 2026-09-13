import { formatNumber, formatPercent } from '../../lib/format';

function StatCard({ label, value, tone = 'default' }) {
  const toneClass = {
    default: 'text-[var(--text-primary)]',
    critical: 'text-[var(--status-critical)]',
    warning: 'text-[var(--status-warning)]',
    success: 'text-[var(--status-success)]',
  }[tone];

  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-[var(--radius-card)] p-4 shadow-[var(--shadow-sm)]">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
        {label}
      </p>
      <p className={`text-2xl font-bold mt-1 tabular-nums ${toneClass}`}>{value}</p>
    </div>
  );
}

export default function HistoryStats({ stats }) {
  if (!stats) return null;

  const tone =
    stats.mdr_rate >= 60 ? 'critical' : stats.mdr_rate >= 30 ? 'warning' : 'success';

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard label="Total Records" value={formatNumber(stats.total)} />
      <StatCard label="MDR Rate" value={formatPercent(stats.mdr_rate)} tone={tone} />
      <StatCard label="Active Anomalies" value={formatNumber(stats.anomaly_count)} tone="warning" />
      <StatCard label="Last 7 Days" value={formatNumber(stats.recent_week)} />
    </div>
  );
}

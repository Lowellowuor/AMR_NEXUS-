import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { formatNumber, formatPercent } from '../../lib/format';

function DeltaIndicator({ value, suffix = '', higherIsBetter = false }) {
  if (value == null) return <span className="text-xs text-[var(--text-muted)]">—</span>;
  const positive = value > 0;
  const negative = value < 0;
  const Icon = positive ? TrendingUp : negative ? TrendingDown : Minus;
  const isGood = higherIsBetter ? positive : negative;
  const tone = value === 0 ? 'text-[var(--text-muted)]'
    : isGood ? 'text-[var(--status-success)]'
    : 'text-[var(--status-critical)]';
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums ${tone}`}>
      <Icon className="w-3 h-3" />
      {positive ? '+' : ''}{value}{suffix}
    </span>
  );
}

function Row({ label, aValue, bValue, delta, suffix = '', higherIsBetter = false }) {
  return (
    <div className="grid grid-cols-4 gap-2 py-3 border-b border-[var(--border-primary)] last:border-0 items-center">
      <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
        {label}
      </span>
      <span className="text-right text-sm tabular-nums text-[var(--text-secondary)]">{aValue}</span>
      <span className="text-right text-sm tabular-nums text-[var(--text-secondary)]">{bValue}</span>
      <span className="text-right">
        <DeltaIndicator value={delta} suffix={suffix} higherIsBetter={higherIsBetter} />
      </span>
    </div>
  );
}

export default function CompareMetrics({ a, b, deltas }) {
  if (!a || !b) return null;

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-5">
      <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Headline comparison</h3>

      <div className="grid grid-cols-4 gap-2 pb-2 border-b-2 border-[var(--border-primary)] mb-1">
        <span />
        <span className="text-right text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">A</span>
        <span className="text-right text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">B</span>
        <span className="text-right text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Delta</span>
      </div>

      <Row label="Total isolates" aValue={formatNumber(a.total_records)} bValue={formatNumber(b.total_records)} delta={deltas.total_records} />
      <Row label="MDR rate" aValue={formatPercent(a.mdr_rate)} bValue={formatPercent(b.mdr_rate)} delta={deltas.mdr_rate} suffix=" pts" />
      <Row label="Anomalies" aValue={formatNumber(a.anomaly_count)} bValue={formatNumber(b.anomaly_count)} delta={deltas.anomaly_count} />
      <Row label="Active counties" aValue={formatNumber(a.active_counties)} bValue={formatNumber(b.active_counties)} delta={deltas.active_counties} higherIsBetter />
    </div>
  );
}

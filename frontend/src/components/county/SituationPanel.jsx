import { formatNumber, formatPercent } from '../../lib/format';

export default function SituationPanel({ situation }) {
  if (!situation) return null;
  const {
    total_isolates,
    mdr_count,
    mdr_rate,
    anomaly_count,
    anomaly_rate,
    active_sites,
    lab_confirmed,
    lab_confirmation_coverage_pct,
  } = situation;

  const cells = [
    { label: 'Isolates', value: formatNumber(total_isolates) },
    { label: 'MDR', value: formatNumber(mdr_count), sub: formatPercent(mdr_rate) },
    { label: 'Anomalies', value: formatNumber(anomaly_count), sub: formatPercent(anomaly_rate) },
    { label: 'Active sites', value: formatNumber(active_sites) },
    {
      label: 'Lab confirmed',
      value: formatNumber(lab_confirmed),
      sub: formatPercent(lab_confirmation_coverage_pct),
    },
  ];

  return (
    <div className="rounded-2xl border border-[var(--border-primary)]/40 bg-[var(--bg-secondary)]/80 p-5">
      <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
        Situation
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {cells.map((c) => (
          <div key={c.label}>
            <p className="text-[10px] text-[var(--text-muted)]">{c.label}</p>
            <p className="text-lg font-bold tabular-nums text-[var(--text-primary)]">
              {c.value}
            </p>
            {c.sub && (
              <p className="text-[10px] text-[var(--text-muted)] tabular-nums">
                {c.sub}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
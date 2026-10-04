import { ChartBarIcon, CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';

export default function DataQualityPanel({ quality }) {
  if (!quality) return null;

  const { score_pct, checks_passed, checks_total, missing } = quality;

  const tone =
    score_pct >= 90
      ? 'text-[var(--status-success)]'
      : score_pct >= 60
        ? 'text-[var(--status-warning)]'
        : 'text-[var(--status-critical)]';

  const barTone =
    score_pct >= 90
      ? 'bg-[var(--status-success)]'
      : score_pct >= 60
        ? 'bg-[var(--status-warning)]'
        : 'bg-[var(--status-critical)]';

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border-primary)]">
        <ChartBarIcon className="w-4 h-4 text-[var(--text-muted)]" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Data quality
        </h3>
        <span className={`ml-auto text-xs font-semibold tabular-nums ${tone}`}>
          {score_pct}%
        </span>
      </div>

      <div className="px-4 py-3">
        <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-1.5">
          <span>{checks_passed} of {checks_total} checks passed</span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${barTone}`}
            style={{ width: `${score_pct}%` }}
          />
        </div>
      </div>

      {missing.length > 0 ? (
        <div className="px-4 pb-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
            Missing
          </p>
          <ul className="space-y-1">
            {missing.map((m, i) => (
              <li
                key={i}
                className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]"
              >
                <ExclamationCircleIcon className="w-3.5 h-3.5 text-[var(--status-warning)] flex-shrink-0" />
                {m}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="px-4 pb-3 flex items-center gap-1.5 text-xs text-[var(--status-success)]">
          <CheckCircleIcon className="w-3.5 h-3.5" />
          All quality checks passed
        </div>
      )}
    </div>
  );
}
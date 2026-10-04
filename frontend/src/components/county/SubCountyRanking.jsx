import { ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '@heroicons/react/24/outline';
import { formatNumber, formatPercent } from '../../lib/format';

export default function SubCountyRanking({ ranking }) {
  if (!ranking) return null;
  const { sub_counties, median_rate } = ranking;
  if (!sub_counties || sub_counties.length === 0) {
    return (
      <div className="rounded-2xl border border-[var(--border-primary)]/40 bg-[var(--bg-secondary)]/80 p-5">
        <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-2">
          Sub-county ranking
        </h2>
        <p className="text-xs text-[var(--text-muted)] italic">
          No sub-county data in this window.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[var(--border-primary)]/40 bg-[var(--bg-secondary)]/80 p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">
          Sub-county ranking
        </h2>
        <span className="text-[10px] text-[var(--text-muted)]">
          median {formatPercent(median_rate)}
        </span>
      </div>
      <ul className="space-y-2">
        {sub_counties.map((s) => (
          <li key={s.sub_county} className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2 min-w-0">
              {s.above_median ? (
                <ArrowTrendingUpIcon className="w-3.5 h-3.5 text-[var(--status-critical)] flex-shrink-0" />
              ) : (
                <ArrowTrendingDownIcon className="w-3.5 h-3.5 text-[var(--status-success)] flex-shrink-0" />
              )}
              <span className="truncate text-[var(--text-primary)]">{s.sub_county}</span>
            </span>
            <span className="flex items-center gap-3 flex-shrink-0">
              <span className="text-[var(--text-muted)] tabular-nums">
                {formatNumber(s.samples)}
              </span>
              <span className="font-semibold tabular-nums text-[var(--text-primary)]">
                {formatPercent(s.mdr_rate)}
              </span>
              <span
                className={`tabular-nums w-14 text-right ${
                  s.above_median
                    ? 'text-[var(--status-critical)]'
                    : 'text-[var(--status-success)]'
                }`}
              >
                {s.vs_median > 0 ? '+' : ''}
                {s.vs_median}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
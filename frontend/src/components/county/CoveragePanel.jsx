import { CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { formatNumber, formatPercent } from '../../lib/format';

export default function CoveragePanel({ coverage }) {
  if (!coverage) return null;
  const { facilities_reporting, total_sites, coverage_pct, silent_sites, facilities } = coverage;

  const tone =
    coverage_pct >= 80
      ? 'text-[var(--status-success)]'
      : coverage_pct >= 50
        ? 'text-[var(--status-warning)]'
        : 'text-[var(--status-critical)]';

  const top = (facilities || []).slice(0, 6);

  return (
    <div className="rounded-2xl border border-[var(--border-primary)]/40 bg-[var(--bg-secondary)]/80 p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">
          Facility coverage
        </h2>
        <span className={`text-lg font-bold tabular-nums ${tone}`}>
          {formatPercent(coverage_pct)}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-3 text-xs">
        <div>
          <p className="text-[10px] text-[var(--text-muted)]">Reporting</p>
          <p className="font-semibold tabular-nums text-[var(--text-primary)]">
            {formatNumber(facilities_reporting)}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-[var(--text-muted)]">Total sites</p>
          <p className="font-semibold tabular-nums text-[var(--text-primary)]">
            {formatNumber(total_sites)}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-[var(--text-muted)]">Silent</p>
          <p className="font-semibold tabular-nums text-[var(--status-warning)]">
            {formatNumber(silent_sites)}
          </p>
        </div>
      </div>

      {top.length > 0 ? (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
            Top submitters
          </p>
          <ul className="space-y-1">
            {top.map((f) => (
              <li
                key={f.site_id}
                className="flex items-center justify-between text-xs"
              >
                <span className="truncate text-[var(--text-secondary)]">
                  {f.name}
                </span>
                <span className="flex items-center gap-2">
                  <span className="tabular-nums text-[var(--text-muted)]">
                    {formatNumber(f.submissions)}
                  </span>
                  {f.active ? (
                    <CheckCircleIcon className="w-3.5 h-3.5 text-[var(--status-success)]" />
                  ) : (
                    <ExclamationTriangleIcon className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-xs text-[var(--text-muted)] italic">
          No sites reporting in this window.
        </p>
      )}
    </div>
  );
}
import { GlobeAltIcon, ArrowTrendingUpIcon } from '@heroicons/react/24/outline';
import { formatNumber } from '../../lib/format';

export default function OutbreakContextPanel({ context }) {
  if (!context) return null;

  const { pathogen, county, national_isolates, local_isolates, local_share_pct, elevated } = context;

  return (
    <div
      className={`rounded-[var(--radius-card)] border overflow-hidden ${
        elevated
          ? 'border-[var(--status-warning)]/40 bg-[var(--status-warning-bg)]/20'
          : 'border-[var(--border-primary)] bg-[var(--bg-secondary)]'
      }`}
    >
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border-primary)]/40">
        {elevated ? (
          <ArrowTrendingUpIcon className="w-4 h-4 text-[var(--status-warning)]" />
        ) : (
          <GlobeAltIcon className="w-4 h-4 text-[var(--text-muted)]" />
        )}
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Outbreak context
        </h3>
        {elevated && (
          <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-[var(--status-warning)]">
            Elevated locally
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 px-4 py-3">
        <div>
          <p className="text-[10px] text-[var(--text-muted)]">National isolates</p>
          <p className="text-sm font-semibold text-[var(--text-primary)] tabular-nums">
            {formatNumber(national_isolates)}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-[var(--text-muted)]">
            {county ? `${county} isolates` : 'Local isolates'}
          </p>
          <p className="text-sm font-semibold text-[var(--text-primary)] tabular-nums">
            {formatNumber(local_isolates)}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-[var(--text-muted)]">Local share</p>
          <p
            className={`text-sm font-semibold tabular-nums ${
              elevated
                ? 'text-[var(--status-warning)]'
                : 'text-[var(--text-primary)]'
            }`}
          >
            {local_share_pct}%
          </p>
        </div>
      </div>

      <p className="px-4 pb-3 text-xs text-[var(--text-muted)]">
        {pathogen} in {county || 'national scope'}.{' '}
        {elevated
          ? 'Local share is elevated — cross-check the county hotspot and surveillance records.'
          : 'Local share is within the expected national range.'}
      </p>
    </div>
  );
}
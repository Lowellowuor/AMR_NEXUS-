import { InformationCircleIcon } from '@heroicons/react/24/outline';
import { formatNumber, formatPercent } from '../../lib/format';

export default function BurdenPanel({ burden }) {
  if (!burden) return null;
  const {
    mdr_isolates,
    mdr_rate,
    distinct_mdr_pathogens,
    mdr_per_100k,
    population,
    note,
  } = burden;

  return (
    <div className="rounded-2xl border border-[var(--border-primary)]/40 bg-[var(--bg-secondary)]/80 p-5">
      <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
        AMR burden
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <p className="text-[10px] text-[var(--text-muted)]">MDR isolates</p>
          <p className="text-lg font-bold tabular-nums text-[var(--text-primary)]">
            {formatNumber(mdr_isolates)}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-[var(--text-muted)]">MDR rate</p>
          <p className="text-lg font-bold tabular-nums text-[var(--text-primary)]">
            {formatPercent(mdr_rate)}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-[var(--text-muted)]">MDR pathogens</p>
          <p className="text-lg font-bold tabular-nums text-[var(--text-primary)]">
            {formatNumber(distinct_mdr_pathogens)}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-[var(--text-muted)]">Per 100k</p>
          <p className="text-lg font-bold tabular-nums text-[var(--text-primary)]">
            {mdr_per_100k != null ? formatNumber(mdr_per_100k) : '—'}
          </p>
          {population > 0 && (
            <p className="text-[10px] text-[var(--text-muted)]">
              pop {formatNumber(population)}
            </p>
          )}
        </div>
      </div>
      {note && (
        <div className="mt-3 flex items-start gap-2 text-[10px] text-[var(--text-muted)]">
          <InformationCircleIcon className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>{note}</span>
        </div>
      )}
    </div>
  );
}
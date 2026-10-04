import { Link } from 'react-router-dom';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { formatPercent } from '../../lib/format';

export default function PriorityIsolates({ isolates }) {
  if (!isolates || isolates.length === 0) {
    return (
      <div className="rounded-2xl border border-[var(--border-primary)]/40 bg-[var(--bg-secondary)]/80 p-5">
        <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-2">
          Priority isolates
        </h2>
        <p className="text-xs text-[var(--text-muted)] italic">
          No isolates to prioritise.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[var(--border-primary)]/40 bg-[var(--bg-secondary)]/80 p-5">
      <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
        Priority isolates
      </h2>
      <ul className="divide-y divide-[var(--border-primary)]/30">
        {isolates.map((r) => (
          <li key={r.record_id} className="py-2 flex items-center justify-between gap-3 text-xs">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[var(--text-primary)] font-medium">
                {r.pathogen_code || 'Unnamed'}
              </p>
              <p className="text-[10px] text-[var(--text-muted)]">
                {r.sub_county || '—'} · {r.specimen_type || '—'}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {r.anomaly_flag && (
                <ExclamationTriangleIcon className="w-3.5 h-3.5 text-[var(--status-warning)]" />
              )}
              {r.mdr_flag ? (
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--status-critical)]">
                  MDR
                </span>
              ) : (
                <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                  not MDR
                </span>
              )}
              <span className="tabular-nums text-[var(--text-muted)]">
                {r.mdr_probability != null
                  ? formatPercent(r.mdr_probability * 100)
                  : '—'}
              </span>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-3">
        <Link to="/history" className="text-xs text-[var(--accent-teal)] hover:underline">
          All records →
        </Link>
      </div>
    </div>
  );
}
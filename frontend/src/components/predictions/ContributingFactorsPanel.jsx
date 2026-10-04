import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const STRENGTH_TONE = {
  high: 'text-[var(--status-critical)] bg-[var(--status-critical-bg)]/30',
  medium: 'text-[var(--status-warning)] bg-[var(--status-warning-bg)]/30',
  low: 'text-[var(--text-muted)] bg-[var(--bg-tertiary)]',
};

export default function ContributingFactorsPanel({ factors }) {
  if (!factors || factors.length === 0) return null;

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border-primary)]">
        <ExclamationTriangleIcon className="w-4 h-4 text-[var(--status-warning)]" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Contributing factors
        </h3>
        <span className="ml-auto text-xs text-[var(--text-muted)]">
          {factors.length} identified
        </span>
      </div>

      <ul className="divide-y divide-[var(--border-primary)]/40">
        {factors.map((f, i) => {
          const tone = STRENGTH_TONE[f.strength] || STRENGTH_TONE.low;
          return (
            <li key={i} className="px-4 py-3">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${tone}`}>
                  {f.strength}
                </span>
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  {f.factor}
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                {f.note}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
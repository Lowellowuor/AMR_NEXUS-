import { Link } from 'react-router-dom';
import { ClipboardDocumentListIcon } from '@heroicons/react/24/outline';

const STATUS_TONE = {
  open: 'bg-[var(--status-info-bg)] text-[var(--status-info)]',
  in_progress: 'bg-[var(--status-warning-bg)] text-[var(--status-warning)]',
  done: 'bg-[var(--status-success-bg)] text-[var(--status-success)]',
  closed: 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]',
};

export default function InterventionTracker({ interventions }) {
  if (!interventions || interventions.length === 0) {
    return (
      <div className="rounded-2xl border border-[var(--border-primary)]/40 bg-[var(--bg-secondary)]/80 p-5">
        <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-2 flex items-center gap-2">
          <ClipboardDocumentListIcon className="w-4 h-4 text-[var(--text-muted)]" />
          Intervention tracker
        </h2>
        <p className="text-xs text-[var(--text-muted)] italic">
          No interventions recorded for this county.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[var(--border-primary)]/40 bg-[var(--bg-secondary)]/80 p-5">
      <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
        <ClipboardDocumentListIcon className="w-4 h-4 text-[var(--text-muted)]" />
        Intervention tracker
        <span className="ml-auto text-[10px] text-[var(--text-muted)] font-normal">
          {interventions.length}
        </span>
      </h2>
      <ul className="space-y-2">
        {interventions.map((i) => (
          <li key={i.id} className="flex items-center justify-between gap-3 text-xs">
            <div className="min-w-0">
              <p className="truncate text-[var(--text-primary)]">{i.title}</p>
              <p className="text-[10px] text-[var(--text-muted)]">
                {i.priority}
                {i.due_date
                  ? ` · due ${new Date(i.due_date).toLocaleDateString()}`
                  : ''}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {i.overdue && (
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--status-critical)]">
                  overdue
                </span>
              )}
              <span
                className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  STATUS_TONE[i.status] || STATUS_TONE.closed
                }`}
              >
                {i.status}
              </span>
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-3">
        <Link to="/actions" className="text-xs text-[var(--accent-teal)] hover:underline">
          All actions →
        </Link>
      </div>
    </div>
  );
}
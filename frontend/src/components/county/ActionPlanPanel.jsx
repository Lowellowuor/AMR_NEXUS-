import { Link } from 'react-router-dom';
import { ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline';

export default function ActionPlanPanel({ plan }) {
  if (!plan) return null;
  const { open_plans, overdue_plans, latest_plan } = plan;

  return (
    <div
      className={`rounded-2xl border p-5 ${
        overdue_plans > 0
          ? 'border-[var(--status-warning)]/40 bg-[var(--status-warning-bg)]/15'
          : 'border-[var(--border-primary)]/40 bg-[var(--bg-secondary)]/80'
      }`}
    >
      <div className="flex items-center gap-2 mb-3">
        <ClipboardDocumentCheckIcon className="w-4 h-4 text-[var(--text-muted)]" />
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">
          Action plan status
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <p className="text-[10px] text-[var(--text-muted)]">Open</p>
          <p className="text-lg font-bold tabular-nums text-[var(--text-primary)]">
            {open_plans}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-[var(--text-muted)]">Overdue</p>
          <p
            className={`text-lg font-bold tabular-nums ${
              overdue_plans > 0
                ? 'text-[var(--status-warning)]'
                : 'text-[var(--text-primary)]'
            }`}
          >
            {overdue_plans}
          </p>
        </div>
      </div>

      {latest_plan ? (
        <div className="border-t border-[var(--border-primary)]/40 pt-3">
          <p className="text-xs font-medium text-[var(--text-primary)] truncate">
            {latest_plan.title}
          </p>
          <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
            {latest_plan.status} · {latest_plan.priority}
            {latest_plan.due_date
              ? ` · due ${new Date(latest_plan.due_date).toLocaleDateString()}`
              : ''}
          </p>
        </div>
      ) : (
        <p className="text-xs text-[var(--text-muted)] italic">
          No plan recorded for this county.
        </p>
      )}

      <div className="mt-3">
        <Link to="/actions" className="text-xs text-[var(--accent-teal)] hover:underline">
          Open Actions →
        </Link>
      </div>
    </div>
  );
}
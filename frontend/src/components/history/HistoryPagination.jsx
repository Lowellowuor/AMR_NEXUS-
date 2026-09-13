import { formatNumber } from '../../lib/format';

export default function HistoryPagination({ page, totalPages, total, pageSize, onPrev, onNext }) {
  const from = page * pageSize + 1;
  const to = Math.min((page + 1) * pageSize, total);

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border-primary)] text-sm">
      <span className="text-[var(--text-muted)]">
        Showing {from}–{to} of {formatNumber(total)}
      </span>
      <div className="flex gap-2 items-center">
        <button
          onClick={onPrev}
          disabled={page === 0}
          className="px-3 py-1.5 rounded border border-[var(--border-primary)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] disabled:opacity-50 hover:bg-[var(--bg-tertiary)]"
        >
          Previous
        </button>
        <span className="px-3 py-1.5 text-[var(--text-muted)] text-xs">
          Page {page + 1} of {totalPages}
        </span>
        <button
          onClick={onNext}
          disabled={page >= totalPages - 1}
          className="px-3 py-1.5 rounded border border-[var(--border-primary)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] disabled:opacity-50 hover:bg-[var(--bg-tertiary)]"
        >
          Next
        </button>
      </div>
    </div>
  );
}

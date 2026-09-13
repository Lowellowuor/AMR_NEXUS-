import { GitCompare, Download } from 'lucide-react';

export default function HistoryBulkActions({
  count,
  onClear,
  onCompare,
  onExport,
  onDelete,
  isAdmin,
}) {
  if (count === 0) return null;

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-3 flex flex-wrap items-center gap-3">
      <span className="text-sm text-[var(--text-secondary)]">
        <strong className="tabular-nums">{count}</strong> selected
      </span>
      <div className="flex flex-wrap gap-2 ml-auto">
        <button
          onClick={onClear}
          className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        >
          Clear
        </button>
        {count >= 2 && (
          <button
            onClick={onCompare}
            className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition"
          >
            <GitCompare className="w-3.5 h-3.5" />
            Compare ({Math.min(count, 3)})
          </button>
        )}
        <button
          onClick={onExport}
          className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition"
        >
          <Download className="w-3.5 h-3.5" />
          Export selected
        </button>
        {isAdmin && (
          <button
            onClick={onDelete}
            className="text-sm px-3 py-1.5 rounded-lg bg-[var(--status-critical)] text-white hover:opacity-90"
          >
            Delete selected
          </button>
        )}
      </div>
    </div>
  );
}

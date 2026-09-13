import { Check, CheckCheck } from 'lucide-react';

export default function AlertsBulkActions({ count, onClear, onAcknowledge, loading }) {
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
        <button
          onClick={onAcknowledge}
          disabled={loading}
          className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-[var(--accent-teal)] text-white hover:bg-[var(--accent-teal-hover)] transition disabled:opacity-60"
        >
          {loading ? <Check className="w-3.5 h-3.5 animate-pulse" /> : <CheckCheck className="w-3.5 h-3.5" />}
          Acknowledge {count}
        </button>
      </div>
    </div>
  );
}

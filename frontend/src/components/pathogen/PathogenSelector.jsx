import { Search, X, Calendar } from 'lucide-react';

export default function PathogenSelector({ pathogens, filters, onChange, onClear, loading }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-4 space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1">
            <Search className="w-3 h-3" /> Pathogen
          </span>
          <select
            value={filters.pathogen}
            onChange={(e) => onChange({ pathogen: e.target.value, tab: 'overview' })}
            className="rounded-[var(--radius-input)] border border-[var(--border-primary)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)]"
            disabled={loading}
          >
            <option value="">Select a pathogen...</option>
            {pathogens.map((p) => (
              <option key={p.code} value={p.code}>
                {p.name} - {p.samples} samples  -  {p.mdr_rate}% MDR
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1">
            <Calendar className="w-3 h-3" /> From
          </span>
          <input
            type="date"
            value={filters.start_date}
            onChange={(e) => onChange({ start_date: e.target.value })}
            className="rounded-[var(--radius-input)] border border-[var(--border-primary)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)]"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1">
            <Calendar className="w-3 h-3" /> To
          </span>
          <input
            type="date"
            value={filters.end_date}
            onChange={(e) => onChange({ end_date: e.target.value })}
            className="rounded-[var(--radius-input)] border border-[var(--border-primary)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)]"
          />
        </label>
      </div>

      {(filters.pathogen || filters.county || filters.start_date || filters.end_date) && (
        <div className="flex justify-end">
          <button
            onClick={onClear}
            className="inline-flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--status-critical)] transition"
          >
            <X className="w-3.5 h-3.5" />
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
}

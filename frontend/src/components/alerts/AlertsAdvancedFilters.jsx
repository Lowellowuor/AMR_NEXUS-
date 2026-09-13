import { Calendar } from 'lucide-react';

export default function AlertsAdvancedFilters({ filters, onChange, options }) {
  const counties = options?.counties || [];

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">County</span>
          <select
            value={filters.county}
            onChange={(e) => onChange({ county: e.target.value })}
            className="rounded-[var(--radius-input)] border border-[var(--border-primary)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)]"
          >
            <option value="">All counties</option>
            {counties.map((c) => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}

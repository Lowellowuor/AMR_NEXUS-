import { SlidersHorizontal, Layers, Calendar } from 'lucide-react';

export default function MapFilters({ filters, onChange }) {
  const selectClasses =
    "bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg px-3 py-2 text-sm font-medium text-[var(--text-primary)] cursor-pointer hover:border-[var(--accent-cyan)]/50 focus:outline-none focus:border-[var(--accent-cyan)] transition-colors appearance-none";

  return (
    <div className="flex flex-wrap gap-3 items-center">
      <div className="flex items-center gap-1.5">
        <SlidersHorizontal className="w-4 h-4 text-[var(--text-muted)]" />
        <select
          value={filters.metric}
          onChange={(e) => onChange({ ...filters, metric: e.target.value })}
          className={selectClasses}
        >
          <option value="carbapenem">Carbapenem</option>
          <option value="esbl">ESBL</option>
          <option value="fluoroquinolone">Fluoroquinolone</option>
        </select>
      </div>

      <div className="flex items-center gap-1.5">
        <Layers className="w-4 h-4 text-[var(--text-muted)]" />
        <select
          value={filters.sector}
          onChange={(e) => onChange({ ...filters, sector: e.target.value })}
          className={selectClasses}
        >
          <option value="all">All Sectors</option>
          <option value="human">Human</option>
          <option value="poultry">Poultry</option>
          <option value="environment">Environment</option>
        </select>
      </div>

      <div className="flex items-center gap-1.5">
        <Calendar className="w-4 h-4 text-[var(--text-muted)]" />
        <select
          value={filters.mode}
          onChange={(e) => onChange({ ...filters, mode: e.target.value })}
          className={selectClasses}
        >
          <option value="current">Current Rates</option>
          <option value="difference">Difference</option>
        </select>
      </div>

      {filters.mode === 'difference' && (
        <>
          <input
            type="month"
            value={filters.startMonth}
            onChange={(e) => onChange({ ...filters, startMonth: e.target.value })}
            className={selectClasses}
          />
          <span className="text-[var(--text-muted)]">to</span>
          <input
            type="month"
            value={filters.endMonth}
            onChange={(e) => onChange({ ...filters, endMonth: e.target.value })}
            className={selectClasses}
          />
        </>
      )}
    </div>
  );
}
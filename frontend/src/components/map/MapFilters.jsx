import { useQuery } from '@tanstack/react-query';
import { SlidersHorizontal, Layers, Calendar } from 'lucide-react';
import { getOptions } from '../../api/endpoints';

const controlClass =
  'bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg px-3 py-2 text-sm font-medium text-[var(--text-primary)] cursor-pointer hover:border-[var(--accent-teal)]/50 focus:outline-none focus:border-[var(--accent-teal)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

export default function MapFilters({ filters, onChange, monthRange }) {
  const { data: options } = useQuery({
    queryKey: ['metadata-options'],
    queryFn: getOptions,
    staleTime: 10 * 60 * 1000,
  });

  const metrics = options?.antibiotic_classes || [];
  const sectors = options?.sectors || [];
  const minMonth = monthRange?.min || '';
  const maxMonth = monthRange?.max || '';

  const set = (patch) => onChange({ ...filters, ...patch });

  return (
    <div className="flex flex-wrap gap-3 items-center">
      <div className="flex items-center gap-1.5">
        <SlidersHorizontal className="w-4 h-4 text-[var(--text-muted)]" />
        <select
          value={filters.metric}
          onChange={(e) => set({ metric: e.target.value })}
          className={controlClass}
          disabled={metrics.length === 0}
        >
          {metrics.length === 0 && <option value="">No metrics</option>}
          {metrics.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-1.5">
        <Layers className="w-4 h-4 text-[var(--text-muted)]" />
        <select
          value={filters.sector}
          onChange={(e) => set({ sector: e.target.value })}
          className={controlClass}
        >
          <option value="all">All Sectors</option>
          {sectors.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-1.5">
        <Calendar className="w-4 h-4 text-[var(--text-muted)]" />
        <select
          value={filters.mode}
          onChange={(e) => set({ mode: e.target.value })}
          className={controlClass}
        >
          <option value="current">Current Rates</option>
          <option value="difference">Difference</option>
        </select>
      </div>

      {filters.mode === 'difference' && (
        <>
          <input
            type="month"
            min={minMonth}
            max={maxMonth}
            value={filters.startMonth}
            onChange={(e) => set({ startMonth: e.target.value })}
            className={controlClass}
          />
          <span className="text-[var(--text-muted)] text-sm">to</span>
          <input
            type="month"
            min={minMonth}
            max={maxMonth}
            value={filters.endMonth}
            onChange={(e) => set({ endMonth: e.target.value })}
            className={controlClass}
          />
        </>
      )}
    </div>
  );
}

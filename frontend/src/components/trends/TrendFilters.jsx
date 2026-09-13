import { useQuery } from '@tanstack/react-query';
import { getOptions } from '../../api/endpoints';

export default function TrendFilters({ filters, onChange }) {
  const { data: options, isLoading } = useQuery({
    queryKey: ['metadata-options'],
    queryFn: getOptions,
  });

  const selectClasses =
    "bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg px-4 py-2 text-sm font-medium text-[var(--text-primary)] cursor-pointer hover:border-[var(--accent-cyan)]/50 focus:outline-none focus:border-[var(--accent-cyan)] transition-colors appearance-none";

  if (isLoading) {
    return <div className="text-sm text-[var(--text-muted)]">Loading filters…</div>;
  }

  const pathogens = options?.pathogens || [];
  const antibioticClasses = options?.antibiotic_classes || [];
  const counties = options?.counties || [];

  return (
    <div className="flex flex-wrap gap-3">
      <select
        value={filters.pathogen}
        onChange={(e) => onChange({ ...filters, pathogen: e.target.value })}
        className={selectClasses}
      >
        {pathogens.map((p) => (
          <option key={p.code} value={p.code}>
            {p.name || p.code}
          </option>
        ))}
      </select>

      <select
        value={filters.drug}
        onChange={(e) => onChange({ ...filters, drug: e.target.value })}
        className={selectClasses}
      >
        {antibioticClasses.map((drug) => (
          <option key={drug} value={drug}>
            {drug}
          </option>
        ))}
      </select>

      <select
        value={filters.region}
        onChange={(e) => onChange({ ...filters, region: e.target.value })}
        className={selectClasses}
      >
        {counties.map((county) => (
          <option key={county} value={county}>
            {county}
          </option>
        ))}
      </select>

      <select
        value={filters.months}
        onChange={(e) => onChange({ ...filters, months: Number(e.target.value) })}
        className={selectClasses}
      >
        {[6, 12, 18, 24].map((m) => (
          <option key={m} value={m}>
            Last {m} months
          </option>
        ))}
      </select>
    </div>
  );
}
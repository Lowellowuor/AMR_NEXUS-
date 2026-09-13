import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import TrendChart from '../components/trends/TrendChart';
import TrendFilters from '../components/trends/TrendFilters';
import { getOptions } from '../api/endpoints';

export default function NationalTrends() {
  const { data: options, isLoading: optionsLoading } = useQuery({
    queryKey: ['metadata-options'],
    queryFn: getOptions,
  });

  const [filters, setFilters] = useState({
    pathogen: '',
    drug: '',
    region: '',
    months: 12,
  });

  useEffect(() => {
    if (options) {
      setFilters((prev) => ({
        ...prev,
        pathogen: prev.pathogen || options.pathogens?.[0]?.code || '',
        drug: prev.drug || options.antibiotic_classes?.[0] || '',
        region: prev.region || options.counties?.[0] || '',
      }));
    }
  }, [options]);

  if (optionsLoading) {
    return <div className="text-center py-10 text-[var(--text-muted)]">Loading metadata…</div>;
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
          Trend Analysis
        </h1>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">
          AI‑powered resistance trajectory analysis with anomaly detection
        </p>
      </div>

      <TrendFilters filters={filters} onChange={setFilters} />

      {filters.pathogen && filters.drug && filters.region ? (
        <TrendChart
          pathogen={filters.pathogen}
          drug={filters.drug}
          region={filters.region}
          months={filters.months}
        />
      ) : (
        <div className="card p-8 text-center text-[var(--text-muted)]">
          Select pathogen, drug, and region to view trend.
        </div>
      )}
    </div>
  );
}
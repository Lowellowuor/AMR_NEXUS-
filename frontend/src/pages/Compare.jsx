import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowRightLeft, GitCompare, ExternalLink } from 'lucide-react';

import { comparePeriods, getOptions } from '../api/endpoints';
import { usePageTitle } from '../hooks/usePageTitle';
import { defaultRange } from '../lib/compareConfig';
import { formatDateTime } from '../lib/format';

import ComparePanel from '../components/compare/ComparePanel';
import CompareMetrics from '../components/compare/CompareMetrics';
import CompareDeltaTable from '../components/compare/CompareDeltaTable';
import CompareTrendChart from '../components/compare/CompareTrendChart';
import EmptyState from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';

export default function Compare() {
  usePageTitle('Compare');

  const defaultA = defaultRange(2);
  const defaultB = defaultRange(0);

  const [a, setA] = useState({ ...defaultA, county: '', pathogen: '', sector: '' });
  const [b, setB] = useState({ ...defaultB, county: '', pathogen: '', sector: '' });

  const { data: options } = useQuery({
    queryKey: ['compare-options'],
    queryFn: getOptions,
    staleTime: 10 * 60 * 1000,
  });

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    p.set('a_start', a.start);
    p.set('a_end', a.end);
    if (a.county) p.set('a_county', a.county);
    if (a.pathogen) p.set('a_pathogen', a.pathogen);
    if (a.sector) p.set('a_sector', a.sector);
    p.set('b_start', b.start);
    p.set('b_end', b.end);
    if (b.county) p.set('b_county', b.county);
    if (b.pathogen) p.set('b_pathogen', b.pathogen);
    if (b.sector) p.set('b_sector', b.sector);
    return p.toString();
  }, [a, b]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['compare-periods', qs],
    queryFn: () => comparePeriods(qs),
    enabled: !!a.start && !!a.end && !!b.start && !!b.end,
    staleTime: 60_000,
  });

  const labelA = `${a.start} - ${a.end}`;
  const labelB = `${b.start} - ${b.end}`;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-[var(--accent-teal)]" />
            Compare
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            Compare two periods, geographies, or pathogen scopes side by side
          </p>
        </div>
        <Link
          to="/history"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--accent-teal)] hover:underline"
        >
          <GitCompare className="w-3.5 h-3.5" />
          Need record-level comparison? Use History
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ComparePanel title="Period A (baseline)" value={a} onChange={setA} options={options} />
        <ComparePanel title="Period B (comparison)" value={b} onChange={setB} options={options} />
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-40 rounded-[var(--radius-card)]" />
          <Skeleton className="h-64 rounded-[var(--radius-card)]" />
        </div>
      ) : isError ? (
        <EmptyState
          icon={ArrowRightLeft}
          title="Could not run comparison"
          description={error?.message || 'Try adjusting the periods.'}
        />
      ) : !data ? (
        <EmptyState
          icon={ArrowRightLeft}
          title="Pick two scopes to compare"
          description="Set period ranges and optional county/pathogen filters above."
        />
      ) : (
        <>
          <CompareMetrics a={data.a.summary} b={data.b.summary} deltas={data.deltas} />
          <CompareTrendChart a={data.a.trend} b={data.b.trend} labelA={labelA} labelB={labelB} />
          <CompareDeltaTable title="Delta by pathogen" rows={data.by_pathogen} keyLabel="Pathogen" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <CompareDeltaTable title="Delta by sector" rows={data.by_sector} keyLabel="Sector" max={6} />
            <CompareDeltaTable title="Delta by county" rows={data.by_county} keyLabel="County" max={6} />
          </div>
          <p className="text-xs text-[var(--text-muted)] text-center">
            Comparison generated {formatDateTime(new Date().toISOString())}
            {' - '}
            <Link to="/history" className="text-[var(--accent-teal)] hover:underline">
              Open records <ExternalLink className="inline w-3 h-3" />
            </Link>
          </p>
        </>
      )}
    </div>
  );
}

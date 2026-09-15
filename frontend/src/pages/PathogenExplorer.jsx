import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Beaker } from 'lucide-react';

import { getPathogenList, getPathogenDetail, getCountyDetail } from '../api/endpoints';
import { usePageTitle } from '../hooks/usePageTitle';
import { usePathogenFilters } from '../hooks/usePathogenFilters';

import PathogenPageHeader from '../components/pathogen/PathogenPageHeader';
import PathogenSelector from '../components/pathogen/PathogenSelector';
import PathogenTabs from '../components/pathogen/PathogenTabs';
import PathogenOverviewTab from '../components/pathogen/PathogenOverviewTab';
import PathogenResistanceTab from '../components/pathogen/PathogenResistanceTab';
import PathogenGeographyTab from '../components/pathogen/PathogenGeographyTab';
import PathogenTrendsTab from '../components/pathogen/PathogenTrendsTab';
import PathogenRecentTab from '../components/pathogen/PathogenRecentTab';
import EmptyState from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
import PathogenRegionDrawer from '../components/geo/drawers/PathogenRegionDrawer';
import { useRegionSelection } from '../components/geo/useRegionSelection';

export default function PathogenExplorer() {
  usePageTitle('Pathogen Explorer');
  const { filters, update, reset, queryParams } = usePathogenFilters();
  const [selectedRegion, setSelectedRegion] = useState(null);
  const { select: selectRegion, clear: clearRegion } = useRegionSelection();

  const { data: pathogens, isLoading: listLoading } = useQuery({
    queryKey: ['pathogen-list'],
    queryFn: () => getPathogenList(''),
    staleTime: 5 * 60 * 1000,
  });

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['pathogen-detail', filters.pathogen, queryParams],
    queryFn: () => getPathogenDetail(filters.pathogen, queryParams),
    enabled: !!filters.pathogen,
    staleTime: 60_000,
  });

  const counts = data
    ? {
        resistance: data.by_class?.length || 0,
        geography: data.by_county?.length || 0,
        trends: data.trend?.length || 0,
        recent: data.recent?.length || 0,
      }
    : {};

  const handleExport = () => {
    if (!data) return;
    const rows = [
      ['Pathogen', data.code],
      ['Total samples', data.summary.samples],
      ['MDR count', data.summary.mdr_count],
      ['MDR rate', `${data.summary.mdr_rate}%`],
      [],
      ['Antibiotic class', 'Samples', 'MDR count', 'MDR rate'],
      ...(data.by_class || []).map((r) => [r.antibiotic_class, r.samples, r.mdr_count, `${r.resistance}%`]),
    ];
    const csv = rows.map((row) => row.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${data.code.replace(/[^a-z0-9]/gi, '_')}_resistance.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="space-y-5">
      <PathogenPageHeader
        summary={data?.summary}
        pathogen={data?.code || filters.pathogen}
        isFetching={isFetching}
        onRefresh={() => refetch()}
        onExport={handleExport}
      />

      <PathogenSelector
        pathogens={pathogens || []}
        filters={filters}
        onChange={update}
        onClear={reset}
        loading={listLoading}
      />

      {!filters.pathogen ? (
        <EmptyState
          icon={Beaker}
          title="Select a pathogen to begin"
          description="Choose a pathogen above to see resistance patterns, geographic distribution, and trends."
        />
      ) : isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 rounded-[var(--radius-card)]" />
            ))}
          </div>
          <Skeleton className="h-64 rounded-[var(--radius-card)]" />
        </div>
      ) : isError ? (
        <EmptyState
          icon={Beaker}
          title="Could not load pathogen data"
          description={error?.message || 'Try again.'}
        />
      ) : !data || data.summary?.samples === 0 ? (
        <EmptyState
          icon={Beaker}
          title={`No data for ${filters.pathogen}`}
          description="No records matched this pathogen or the current filters."
        />
      ) : data ? (
        <>
          <PathogenTabs
            active={filters.tab}
            onChange={(tab) => update({ tab })}
            counts={counts}
          />
          <div>
            {filters.tab === 'overview' && <PathogenOverviewTab data={data} onTabChange={(tab) => update({ tab })} />}
            {filters.tab === 'resistance' && <PathogenResistanceTab data={data} />}
            {filters.tab === 'geography' && (
              <>
                <PathogenGeographyTab
                  data={data}
                  onCountyClick={async (props) => {
                    setSelectedRegion({
                      ...props,
                      mdr_rate: props.mdr_rate != null ? Number(props.mdr_rate) : null,
                      pathogen_code: data?.code,
                    });
                    selectRegion(props.county);
                    try {
                      const params = (queryParams ? queryParams + '&' : '') + 'pathogen=' + encodeURIComponent(data?.code || '');
                      const detail = await getCountyDetail(props.county, params);
                      setSelectedRegion((prev) => prev ? { ...prev, ...detail } : prev);
                    } catch (e) { /* keep basic */ }
                  }}
                />
                <PathogenRegionDrawer
                  region={selectedRegion}
                  onClose={() => { setSelectedRegion(null); clearRegion(); }}
                />
              </>
            )}
            {filters.tab === 'trends' && <PathogenTrendsTab data={data} />}
            {filters.tab === 'recent' && <PathogenRecentTab data={data} />}
          </div>
        </>
      ) : null}
    </div>
  );
}

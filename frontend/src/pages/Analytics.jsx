import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { formatNumber, formatPercent } from '../lib/format';
import { chartColors, tooltipStyle, axisTick } from '../lib/chartTheme';

import api from '../api/client';
import { getOptions, getMonthRange, getCountyDetail, getSubCountyMDR } from '../api/endpoints';
import { usePageTitle } from '../hooks/usePageTitle';
import { useAnalyticsFilters } from '../hooks/useAnalyticsFilters';
import { rangeForPreset } from '../lib/analyticsConfig';

import AnalyticsPageHeader from '../components/analytics/AnalyticsPageHeader';
import AnalyticsTabs from '../components/analytics/AnalyticsTabs';
import AnalyticsFilterBar from '../components/analytics/AnalyticsFilterBar';
import EmptyState from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';
import { BarChart3 } from 'lucide-react';
import CountyChoroplethMap from '../components/map/CountyChoroplethMap';
import AnalyticsRegionDrawer from '../components/geo/drawers/AnalyticsRegionDrawer';
import { useRegionSelection } from '../components/geo/useRegionSelection';

function MetricCard({ label, value, hint, tone = 'default' }) {
  const toneClass = {
    default: 'text-[var(--text-primary)]',
    critical: 'text-[var(--status-critical)]',
    warning: 'text-[var(--status-warning)]',
    success: 'text-[var(--status-success)]',
  }[tone];
  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">{label}</p>
      <p className={`text-2xl font-bold tabular-nums mt-1 ${toneClass}`}>{value}</p>
      {hint && <p className="text-xs text-[var(--text-muted)] mt-1">{hint}</p>}
    </div>
  );
}

const PIE_COLORS = ['var(--accent-blue)', 'var(--accent-teal)', 'var(--status-success)', 'var(--status-warning)', 'var(--status-critical)'];

export default function Analytics() {
  usePageTitle('Analytics');
  const { filters, update, queryParams } = useAnalyticsFilters();
  const [compareRecords] = useState([]);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const { select: selectRegion, clear: clearRegion } = useRegionSelection();

  // Ensure a default range on first load
  useMemo(() => {
    if (!filters.start_date && !filters.end_date && filters.preset !== 'custom') {
      const r = rangeForPreset(filters.preset);
      update({ start_date: r.start, end_date: r.end });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { data: options } = useQuery({
    queryKey: ['analytics-options'],
    queryFn: getOptions,
    staleTime: 10 * 60 * 1000,
  });

  const { data: monthRange } = useQuery({
    queryKey: ['month-range'],
    queryFn: getMonthRange,
    staleTime: 10 * 60 * 1000,
  });

  const summaryQuery = useQuery({
    queryKey: ['analytics-summary', queryParams],
    queryFn: () => api.getSummary(queryParams),
    enabled: !!filters.start_date,
    staleTime: 30_000,
  });

  const trendQuery = useQuery({
    queryKey: ['analytics-trend', queryParams],
    queryFn: () => api.getMDRTrend(12, queryParams),
    enabled: !!filters.start_date,
    staleTime: 60_000,
  });

  const pathogenQuery = useQuery({
    queryKey: ['analytics-pathogen', queryParams],
    queryFn: () => api.getByPathogen(15, queryParams),
    enabled: !!filters.start_date,
    staleTime: 60_000,
  });

  const sectorQuery = useQuery({
    queryKey: ['analytics-sector', queryParams],
    queryFn: () => api.getBySector(queryParams),
    enabled: !!filters.start_date,
    staleTime: 60_000,
  });

  const topCountiesQuery = useQuery({
    queryKey: ['analytics-top-counties', queryParams],
    queryFn: () => api.getTopCounties(15, queryParams),
    enabled: !!filters.start_date,
    staleTime: 60_000,
  });

  const subCountyParams = (() => {
    if (!filters.county) return '';
    const p = new URLSearchParams();
    p.set('county', filters.county);
    if (filters.start_date) p.set('start_date', filters.start_date);
    if (filters.end_date) p.set('end_date', filters.end_date);
    return p.toString();
  })();

  const subCountyWideParams = (() => {
    if (!filters.county) return '';
    return 'county=' + encodeURIComponent(filters.county);
  })();

  const subCountyQuery = useQuery({
    queryKey: ['analytics-sub-counties', subCountyParams],
    queryFn: () => getSubCountyMDR(subCountyParams),
    enabled: !!filters.county && filters.tab === 'geography',
    staleTime: 60_000,
  });

  const subCountyFallbackQuery = useQuery({
    queryKey: ['analytics-sub-counties-alltime', subCountyWideParams],
    queryFn: () => getSubCountyMDR(subCountyWideParams),
    enabled: !!filters.county
      && filters.tab === 'geography'
      && !subCountyQuery.isLoading
      && (subCountyQuery.data?.features || []).length === 0,
    staleTime: 60_000,
  });

  const isFetching =
    summaryQuery.isFetching ||
    trendQuery.isFetching ||
    pathogenQuery.isFetching ||
    sectorQuery.isFetching ||
    topCountiesQuery.isFetching;

  const isLoading = summaryQuery.isLoading || !filters.start_date;

  const refetchAll = () => {
    summaryQuery.refetch();
    trendQuery.refetch();
    pathogenQuery.refetch();
    sectorQuery.refetch();
    topCountiesQuery.refetch();
  };

  const summary = summaryQuery.data || {};
  const counties = topCountiesQuery.data || [];

  const isCountySelected = !!filters.county;
  const primaryFeatures = subCountyQuery.data?.features || [];
  const fallbackFeatures = subCountyFallbackQuery.data?.features || [];
  const subCountyFeatures = primaryFeatures.length > 0 ? primaryFeatures : fallbackFeatures;
  const usingWideFallback = primaryFeatures.length === 0 && fallbackFeatures.length > 0;
  const subCounties = subCountyFeatures.map((f) => {
    const props = f.properties || {};
    return {
      county: props.county,
      sub_county: props.sub_county,
      rate: (props.mdr_rate ?? 0) * 100,
      samples: props.sample_count,
      displayName: props.sub_county,
    };
  });
  const tableRows = isCountySelected ? subCounties : counties;
  const tableTitle = isCountySelected
    ? filters.county + ' sub-counties' + (usingWideFallback ? ' (all-time)' : '')
    : 'Top counties by MDR rate';

  const openRegion = async (region) => {
    const delta = (region.mdr_rate != null && summary.mdr_rate != null)
      ? +(region.mdr_rate - summary.mdr_rate).toFixed(1)
      : null;
    const baseContext = {
      filter_pathogen: filters.pathogen || null,
      filter_sector: filters.sector || null,
      filter_period: filters.start_date && filters.end_date
        ? filters.start_date + ' to ' + filters.end_date
        : null,
      delta_vs_national: delta,
    };
    setSelectedRegion({ ...region, ...baseContext });
    selectRegion(region.county);

    const apply = (payload) => setSelectedRegion((prev) => prev ? { ...prev, ...payload } : prev);

    try {
      const detail = await getCountyDetail(region.county, queryParams);
      if (detail.samples > 0) {
        apply(detail);
        return;
      }

      if (filters.pathogen || filters.sector) {
        const t2 = new URLSearchParams();
        if (filters.start_date) t2.set('start_date', filters.start_date);
        if (filters.end_date) t2.set('end_date', filters.end_date);
        const r2 = await getCountyDetail(region.county, t2.toString());
        if (r2.samples > 0) {
          apply({
            ...r2,
            filter_pathogen: null,
            filter_sector: null,
            fallback_note: 'No isolates matched the current pathogen/sector filter. Showing all isolates in the same period.',
          });
          return;
        }
      }

      const r3 = await getCountyDetail(region.county, '');
      if (r3.samples > 0) {
        apply({
          ...r3,
          filter_pathogen: null,
          filter_sector: null,
          filter_period: null,
          fallback_note: 'No isolates in the selected period for this county. Showing the most recent data available instead.',
        });
        return;
      }

      apply({
        ...detail,
        fallback_note: 'No isolates recorded for this county under any filter.',
      });
    } catch (e) { /* keep basic */ }
  };
  const trend = trendQuery.data || [];
  const pathogens = pathogenQuery.data || [];
  const sectors = sectorQuery.data || [];
  
  const hasActive =
    !!filters.county || !!filters.pathogen || !!filters.sector;

  const handleExport = () => {
    const rows = [
      ['Analytics Export'],
      ['Period', `${filters.start_date} to ${filters.end_date}`],
      ['County', filters.county || 'All'],
      ['Pathogen', filters.pathogen || 'All'],
      ['Sector', filters.sector || 'All'],
      [],
      ['Summary'],
      ['Total records', summary.total_records ?? 0],
      ['MDR rate', `${summary.mdr_rate ?? 0}%`],
      ['Anomaly count', summary.anomaly_count ?? 0],
      ['Active counties', summary.active_counties ?? 0],
      [],
      ['Pathogen', 'Resistance %'],
      ...pathogens.map((p) => [p.name, p.resistance]),
      [],
      ['Sector', 'MDR %'],
      ...sectors.map((s) => [s.name, s.value]),
      [],
      ['County', 'MDR %'],
      ...counties.map((c) => [c.county, c.rate]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `analytics_${filters.start_date}_${filters.end_date}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="space-y-5">
      <AnalyticsPageHeader
        isFetching={isFetching}
        onRefresh={refetchAll}
        onExport={handleExport}
      />

      <AnalyticsFilterBar
        filters={filters}
        onChange={update}
        options={options}
        hasActive={hasActive}
      />

      <AnalyticsTabs active={filters.tab} onChange={(t) => update({ tab: t })} />

      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-[var(--radius-card)]" />
          ))}
          <Skeleton className="h-80 rounded-[var(--radius-card)] lg:col-span-4" />
        </div>
      ) : (
        <div>
          {filters.tab === 'summary' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard label="Total records" value={formatNumber(summary.total_records)} hint="Isolates in period" />
                <MetricCard
                  label="MDR rate"
                  value={formatPercent(summary.mdr_rate)}
                  tone={
                    (summary.mdr_rate ?? 0) >= 60 ? 'critical'
                      : (summary.mdr_rate ?? 0) >= 30 ? 'warning'
                      : 'success'
                  }
                />
                <MetricCard label="Anomalies" value={formatNumber(summary.anomaly_count)} tone="warning" />
                <MetricCard label="Active counties" value={formatNumber(summary.active_counties)} />
              </div>

              <div className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-5">
                <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
                  Monthly MDR trend
                </h3>
                {trend.length === 0 ? (
                  <EmptyState icon={BarChart3} title="No trend data" description="Try a wider date range." />
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={trend}>
                      <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                      <XAxis dataKey="month" tick={axisTick} />
                      <YAxis unit="%" domain={[0, 100]} tick={axisTick} />
                      <Tooltip formatter={(v) => `${v}%`} contentStyle={tooltipStyle} />
                      <Line type="monotone" dataKey="rate" stroke={chartColors.blue} strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          )}

          {filters.tab === 'trends' && (
            <div className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-5">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">MDR rate over time</h3>
              {trend.length === 0 ? (
                <EmptyState icon={BarChart3} title="No trend data" />
              ) : (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                    <XAxis dataKey="month" tick={axisTick} />
                    <YAxis unit="%" domain={[0, 100]} tick={axisTick} />
                    <Tooltip formatter={(v) => `${v}%`} contentStyle={tooltipStyle} />
                    <Line type="monotone" dataKey="rate" stroke={chartColors.blue} strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          )}

          {filters.tab === 'pathogens' && (
            <div className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-5">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
                Resistance by pathogen (top 15)
              </h3>
              {pathogens.length === 0 ? (
                <EmptyState icon={BarChart3} title="No pathogen data" />
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(300, pathogens.length * 28)}>
                  <BarChart data={pathogens} layout="vertical" margin={{ left: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                    <XAxis type="number" unit="%" domain={[0, 100]} tick={axisTick} />
                    <YAxis type="category" dataKey="name" width={160} tick={axisTick} />
                    <Tooltip formatter={(v) => `${v}%`} contentStyle={tooltipStyle} />
                    <Bar dataKey="resistance" fill={chartColors.blue} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          )}

          {filters.tab === 'sectors' && (
            <div className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-5">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Distribution by sector</h3>
              {sectors.length === 0 ? (
                <EmptyState icon={BarChart3} title="No sector data" />
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <ResponsiveContainer width="100%" height={320}>
                    <PieChart>
                      <Pie data={sectors} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                        {sectors.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => `${v}%`} contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2 flex flex-col justify-center">
                    {sectors.map((s, i) => (
                      <div key={s.name} className="flex items-center gap-3">
                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span className="text-sm text-[var(--text-secondary)] capitalize flex-1">{s.name}</span>
                        <span className="text-sm font-bold tabular-nums text-[var(--text-primary)]">{formatPercent(s.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {filters.tab === 'geography' && (
            <div className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-primary)]">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Sub-county MDR rate</h3>
                <span className="text-xs text-[var(--text-muted)]">Click a marker or a row for details</span>
              </div>
              <div className="h-[420px] w-full min-h-0">
                <CountyChoroplethMap
                  county={filters.county || undefined}
                  startDate={filters.start_date}
                  endDate={filters.end_date}
                  onCountyClick={(props) => openRegion({ county: props.county, sub_county: props.sub_county, mdr_rate: (props.mdr_rate ?? 0) * 100, samples: props.sample_count })}
                />
              </div>
              <div className="border-t border-[var(--border-primary)]">
                <div className="px-4 py-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">{tableTitle}</h4>
                </div>
                {tableRows.length === 0 ? (
                  <div className="p-8"><EmptyState icon={BarChart3} title={isCountySelected ? "No sub-county data" : "No county data"} /></div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-[var(--bg-tertiary)] border-b border-[var(--border-primary)]">
                        <tr>
                          <th className="text-left px-4 py-2 font-semibold text-[var(--text-secondary)]">#</th>
                          <th className="text-left px-4 py-2 font-semibold text-[var(--text-secondary)]">County</th>
                          <th className="text-right px-4 py-2 font-semibold text-[var(--text-secondary)]">n</th>
                          <th className="text-right px-4 py-2 font-semibold text-[var(--text-secondary)]">MDR rate</th>
                          <th className="text-right px-4 py-2 font-semibold text-[var(--text-secondary)]">vs national</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-primary)]">
                        {tableRows.map((c, i) => {
                          const delta = (c.rate != null && summary.mdr_rate != null)
                            ? +(c.rate - summary.mdr_rate).toFixed(1)
                            : null;
                          const tone = delta == null ? 'text-[var(--text-muted)]'
                            : delta > 5 ? 'text-[var(--status-critical)]'
                            : delta < -5 ? 'text-[var(--status-success)]'
                            : 'text-[var(--text-muted)]';
                          return (
                            <tr
                              key={`${c.county}-${c.sub_county || "row"}`}
                              onClick={() => openRegion({ county: c.county, sub_county: c.sub_county, mdr_rate: c.rate, samples: c.samples })}
                              className="hover:bg-[var(--bg-tertiary)]/40 cursor-pointer"
                            >
                              <td className="px-4 py-2 text-[var(--text-muted)] tabular-nums">{i + 1}</td>
                              <td className="px-4 py-2 text-[var(--text-primary)] font-medium">{c.displayName || c.county}</td>
                              <td className="px-4 py-2 text-right tabular-nums text-[var(--text-secondary)]">
                                {c.samples != null ? formatNumber(c.samples) : '-'}
                              </td>
                              <td className="px-4 py-2 text-right tabular-nums font-bold text-[var(--text-primary)]">
                                {formatPercent(c.rate)}
                              </td>
                              <td className={'px-4 py-2 text-right tabular-nums font-semibold ' + tone}>
                                {delta == null ? '-' : (delta > 0 ? '+' : '') + delta + ' pts'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <AnalyticsRegionDrawer
                region={selectedRegion}
                onClose={() => { setSelectedRegion(null); clearRegion(); }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

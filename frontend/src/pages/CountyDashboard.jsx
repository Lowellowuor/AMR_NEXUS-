import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useOutletContext, Link } from 'react-router-dom';
import {
  MapPin, Building2, ExternalLink,
} from 'lucide-react';

import api from '../api/client';
import {
  getDashboardSummary, getCountyRank, getFacilityCoverage, getSubCountyMDR, fetchAlerts, getCountyDetail,
} from '../api/endpoints';
import { usePageTitle } from '../hooks/usePageTitle';
import { formatNumber, formatPercent, timeAgo } from '../lib/format';

import TimeScopeSelector from '../components/dashboard/TimeScopeSelector';
import FreshnessIndicator from '../components/dashboard/FreshnessIndicator';
import CountyChoroplethMap from '../components/map/CountyChoroplethMap';
import CountySubCountyDrawer from '../components/geo/drawers/CountySubCountyDrawer';
import CountyTabs from '../components/county/CountyTabs';
import TrendComparisonChart from '../components/county/TrendComparisonChart';
import { useRegionSelection } from '../components/geo/useRegionSelection';
import AlertFeedPanel from '../components/alerts/AlertFeedPanel';
import AlertDetailDrawer from '../components/alerts/AlertsDetailDrawer';
import AnomalySummary from '../components/trends/AnomalySummary';
import CriticalAlertBanner from '../components/alerts/CriticalAlertBanner';
import LLMInsight from '../components/ui/LLMInsight';
import EmptyState from '../components/ui/EmptyState';
import SituationPanel from '../components/county/SituationPanel';
import BurdenPanel from '../components/county/BurdenPanel';
import ActionPlanPanel from '../components/county/ActionPlanPanel';
import InterventionTracker from '../components/county/InterventionTracker';
import PriorityIsolates from '../components/county/PriorityIsolates';
import { Skeleton } from '../components/ui/Skeleton';

function defaultRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 89);
  return {
    preset: '90d',
    start_date: start.toISOString().slice(0, 10),
    end_date: end.toISOString().slice(0, 10),
  };
}

export default function CountyDashboard() {
  usePageTitle('County Dashboard');
  const { selectedCounty, counties } = useOutletContext();
  const [range, setRange] = useState(defaultRange);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [tab, setTab] = useState('overview');
  const [selectedRegion, setSelectedRegion] = useState(null);
  const { select: selectRegion, clear: clearRegion } = useRegionSelection();

  const countyName = counties?.find((c) => c.code === selectedCounty)?.name || selectedCounty || '';
  const qs = `start_date=${range.start_date}&end_date=${range.end_date}`;
  const rangeDays = Math.max(
    1,
    Math.ceil(
      (new Date(range.end_date).getTime() -
        new Date(range.start_date).getTime()) /
        86_400_000,
    ),
  );

  const overviewQuery = useQuery({
    queryKey: ['county-overview', selectedCounty, rangeDays],
    queryFn: () => api.getCountyOverview(selectedCounty, `days=${rangeDays}`),
    enabled: !!selectedCounty,
    staleTime: 60_000,
  });

  const summaryQuery = useQuery({
    queryKey: ['county-summary', selectedCounty, qs],
    queryFn: () => getDashboardSummary(`${qs}&county=${encodeURIComponent(selectedCounty)}`),
    enabled: !!selectedCounty,
    staleTime: 60_000,
  });

  const rankQuery = useQuery({
    queryKey: ['county-rank', selectedCounty, qs],
    queryFn: () => getCountyRank(selectedCounty, qs),
    enabled: !!selectedCounty,
    staleTime: 60_000,
  });

  const coverageQuery = useQuery({
    queryKey: ['county-coverage', selectedCounty, qs],
    queryFn: () => getFacilityCoverage(`${qs}&county=${encodeURIComponent(selectedCounty)}`),
    enabled: !!selectedCounty,
    staleTime: 60_000,
  });

  const subCountyQuery = useQuery({
    queryKey: ['county-subcounty', selectedCounty],
    queryFn: () => getSubCountyMDR(`county=${encodeURIComponent(selectedCounty)}`),
    enabled: !!selectedCounty,
    staleTime: 60_000,
  });

  const alertsQuery = useQuery({
    queryKey: ['county-alerts', selectedCounty],
    queryFn: fetchAlerts,
    enabled: !!selectedCounty,
    staleTime: 30_000,
  });

  const recentQuery = useQuery({
    queryKey: ['county-recent', selectedCounty],
    queryFn: () => api.getPredictions(10, 0, `county=${encodeURIComponent(selectedCounty)}`),
    enabled: !!selectedCounty,
    staleTime: 30_000,
  });

  if (!selectedCounty) {
    return (
      <div className="space-y-5">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">County Dashboard</h1>
        <EmptyState
          icon={MapPin}
          title="Select a county"
          description="Use the county selector in the header to view county-level surveillance."
        />
      </div>
    );
  }

  const isLoading = summaryQuery.isLoading;
  const current = summaryQuery.data?.current || {};
  const previous = summaryQuery.data?.previous || null;
  const rank = rankQuery.data;
  const coverage = coverageQuery.data;
  const subCountyFeatures = subCountyQuery.data?.features || [];
  const allAlerts = alertsQuery.data || [];
  const countyAlerts = allAlerts.filter((a) => a.county === selectedCounty);
  const recentRaw = recentQuery.data;
  const recent = Array.isArray(recentRaw) ? recentRaw : recentRaw?.records ?? [];


  return (
    <div className="space-y-5">
      {countyAlerts.length > 0 && (
        <CriticalAlertBanner alerts={countyAlerts.filter((a) => a.severity === 'critical' && !a.resolved)} />
      )}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">{countyName} County</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            County-level AMR surveillance  -  One Health
          </p>
        </div>
        <FreshnessIndicator />
      </div>

      <TimeScopeSelector value={range} onChange={setRange} />

      <CountyTabs
        active={tab}
        onChange={setTab}
        counts={{
          alerts: countyAlerts.filter((a) => !a.resolved).length,
        }}
      />

      {tab === 'overview' && (
        <div className="space-y-5">
          {overviewQuery.isLoading && (
            <Skeleton className="h-28 rounded-[var(--radius-card)]" />
          )}

          {!overviewQuery.isLoading && overviewQuery.data && (
            <>
              <SituationPanel situation={overviewQuery.data.situation} />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <BurdenPanel burden={overviewQuery.data.burden} />
                <ActionPlanPanel plan={overviewQuery.data.action_plan} />
              </div>
            </>
          )}

          {rank && rank.position && (
            <div className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">National ranking</p>
                  <p className="text-2xl font-bold text-[var(--text-primary)] mt-1 tabular-nums">
                    #{rank.position} <span className="text-sm text-[var(--text-muted)] font-normal">of {rank.total_counties}</span>
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">by MDR rate</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">{countyName} rate</p>
                  <p className="text-2xl font-bold text-[var(--text-primary)] mt-1 tabular-nums">{formatPercent(rank.county_rate)}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">{formatNumber(rank.county_samples)} samples</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    vs national ({formatPercent(rank.national_rate)})
                  </p>
                  <p className={`text-2xl font-bold mt-1 tabular-nums ${
                    rank.delta_vs_national > 0 ? 'text-[var(--status-critical)]'
                      : rank.delta_vs_national < 0 ? 'text-[var(--status-success)]'
                      : 'text-[var(--text-primary)]'
                  }`}>
                    {rank.delta_vs_national > 0 ? '+' : ''}{rank.delta_vs_national} pts
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    {rank.delta_vs_national > 0 ? 'Above national' : rank.delta_vs_national < 0 ? 'Below national' : 'At national'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {!isLoading && summaryQuery.data && rank && (
            <LLMInsight
              context={`county summary ${countyName}`}
              title={`Interpretation - ${countyName}`}
              data={{
                current,
                previous,
                rank,
              }}
            />
          )}
        </div>
      )}

      {tab === 'coverage' && (
        <div className="space-y-5">
          <div className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-5">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[var(--accent-teal)]" />
              Facility coverage
            </h3>
            {!coverage ? (
              <Skeleton className="h-24" />
            ) : coverage.expected === 0 ? (
              <p className="text-xs text-[var(--text-muted)]">No facilities registered for this county.</p>
            ) : (
              <>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-3xl font-bold tabular-nums text-[var(--text-primary)]">{coverage.coverage_pct}%</span>
                  <span className="text-xs text-[var(--text-muted)]">{coverage.reporting} of {coverage.expected}</span>
                </div>
                <div className="w-full h-2 rounded-full bg-[var(--bg-tertiary)] overflow-hidden mb-3">
                  <div className={`h-full rounded-full transition-all ${
                    coverage.coverage_pct >= 80 ? 'bg-[var(--status-success)]'
                      : coverage.coverage_pct >= 50 ? 'bg-[var(--status-warning)]'
                      : 'bg-[var(--status-critical)]'
                  }`} style={{ width: `${Math.min(coverage.coverage_pct, 100)}%` }} />
                </div>
                {coverage.silent_facilities?.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">
                      Silent this period
                    </p>
                    <ul className="space-y-0.5 max-h-32 overflow-y-auto">
                      {coverage.silent_facilities.slice(0, 8).map((f) => (
                        <li key={f.id} className="text-xs text-[var(--text-secondary)] truncate"> -  {f.name}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>

          {overviewQuery.data && (
            <>
              <ActionPlanPanel plan={overviewQuery.data.action_plan} />
              <PriorityIsolates isolates={overviewQuery.data.priority_isolates} />
              <InterventionTracker interventions={overviewQuery.data.interventions} />
            </>
          )}
        </div>
      )}

      {tab === 'geography' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
            <div className="lg:col-span-3">
              <div className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-5 overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                    {countyName} resistance heatmap
                  </h3>
                  <span className="text-xs text-[var(--text-muted)]">Sub-county MDR rate</span>
                </div>
                <div className="h-[420px] w-full min-h-0 rounded-lg overflow-hidden">
                  <CountyChoroplethMap
                    darkMode={false}
                    mode="current"
                    county={selectedCounty}
                    startDate={range.start_date}
                    endDate={range.end_date}
                    onCountyClick={async (props) => {
                      setSelectedRegion(props);
                      selectRegion(props.sub_county || props.county);
                      try {
                        const detail = await getCountyDetail(selectedCounty, qs);
                        setSelectedRegion((prev) => ({ ...prev, ...detail, sub_county: props.sub_county }));
                      } catch (_e) { /* keep basic */ }
                    }}
                  />
                </div>
              </div>

              <CountySubCountyDrawer
                region={selectedRegion}
                onClose={() => { setSelectedRegion(null); clearRegion(); }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] overflow-hidden">
              <div className="px-5 py-3 border-b border-[var(--border-primary)]">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Sub-county MDR rate</h3>
              </div>
              {subCountyFeatures.length === 0 ? (
                <EmptyState title="No sub-county data" />
              ) : (
                <div className="overflow-x-auto max-h-80">
                  <table className="w-full text-sm">
                    <thead className="bg-[var(--bg-tertiary)] sticky top-0">
                      <tr>
                        <th className="text-left px-5 py-2 font-semibold text-[var(--text-secondary)]">Sub-county</th>
                        <th className="text-right px-5 py-2 font-semibold text-[var(--text-secondary)]">MDR rate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-primary)]">
                      {subCountyFeatures
                        .map((f) => f.properties)
                        .sort((a, b) => (b.mdr_rate ?? 0) - (a.mdr_rate ?? 0))
                        .map((p) => {
                          const rate = (p.mdr_rate ?? 0) * 100;
                          return (
                            <tr
                              key={`${p.county}-${p.sub_county}`}
                              onClick={async () => {
                                setSelectedRegion({
                                  county: p.county,
                                  sub_county: p.sub_county,
                                  mdr_rate: rate,
                                  samples: p.sample_count,
                                });
                                try {
                                  const detail = await getCountyDetail(p.county, qs);
                                  setSelectedRegion((prev) => prev ? { ...prev, ...detail, sub_county: p.sub_county } : prev);
                                } catch (_e) { /* keep basic */ }
                              }}
                              className="hover:bg-[var(--bg-tertiary)]/40 cursor-pointer"
                            >
                              <td className="px-5 py-2 text-[var(--text-primary)]">{p.sub_county}</td>
                              <td className={`px-5 py-2 text-right tabular-nums font-bold ${
                                rate >= 60 ? 'text-[var(--status-critical)]'
                                  : rate >= 30 ? 'text-[var(--status-warning)]'
                                  : 'text-[var(--status-success)]'
                              }`}>
                                {formatPercent(rate)}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] overflow-hidden">
              <div className="px-5 py-3 border-b border-[var(--border-primary)]">
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">Recent submissions</h3>
              </div>
              {recent.length === 0 ? (
                <EmptyState title="No recent submissions" />
              ) : (
                <ul className="divide-y divide-[var(--border-primary)] max-h-80 overflow-y-auto">
                  {recent.map((r) => (
                    <li key={r.record_id}>
                      <Link
                        to={`/history?record=${r.record_id}`}
                        className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-[var(--bg-tertiary)]/40 transition group"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-sm font-medium text-[var(--text-primary)] truncate">{r.pathogen_code || 'Unknown'}</span>
                            {r.mdr_flag && (
                              <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[var(--status-critical-bg)] text-[var(--status-critical)]">
                                MDR
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[var(--text-muted)]">{r.sub_county || '-'}  -  {timeAgo(r.timestamp)}</p>
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition flex-shrink-0" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'alerts' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <AlertFeedPanel
            alerts={countyAlerts}
            onAlertClick={(a) => setSelectedAlert(a.id)}
          />
          <AnomalySummary
            anomalies={countyAlerts}
            onAnomalyClick={(a) => setSelectedAlert(a.id)}
          />
        </div>
      )}

      {tab === 'trends' && (
        <div className="space-y-5">
          <div className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                {countyName} vs national — MDR trend
              </h3>
              <span className="text-xs text-[var(--text-muted)]">
                {countyName} solid · National dashed
              </span>
            </div>
            <TrendComparisonChart county={selectedCounty} months={12} />
          </div>
        </div>
      )}

      {selectedAlert && (() => {
        const found = countyAlerts.find((a) => a.id === selectedAlert);
        return found ? <AlertDetailDrawer alert={found} onClose={() => setSelectedAlert(null)} /> : null;
      })()}
    </div>
  );
}

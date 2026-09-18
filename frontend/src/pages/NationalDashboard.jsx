import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { TrendingUp, TrendingDown, Minus, Globe2, Beaker, AlertTriangle, Activity } from 'lucide-react';

import api from '../api/client';
import {
  getDashboardSummary, getGlassIndicators, getTopCountiesWithTrend, getMDRTrend,
  getResistanceByPathogen, fetchAlerts, getCountyDetail,
} from '../api/endpoints';
import { usePageTitle } from '../hooks/usePageTitle';
import { formatNumber, formatPercent } from '../lib/format';
import { chartColors, tooltipStyle, axisTick } from '../lib/chartTheme';

import TimeScopeSelector from '../components/dashboard/TimeScopeSelector';
import FreshnessIndicator from '../components/dashboard/FreshnessIndicator';
import CountyChoroplethMap from '../components/map/CountyChoroplethMap';
import MapTimeSlider from '../components/map/MapTimeSlider';
import NationalCountyDrawer from '../components/geo/drawers/NationalCountyDrawer';
import { useRegionSelection } from '../components/geo/useRegionSelection';
import AlertFeedPanel from '../components/alerts/AlertFeedPanel';
import AlertDetailDrawer from '../components/alerts/AlertsDetailDrawer';
import AnomalySummary from '../components/trends/AnomalySummary';
import CriticalAlertBanner from '../components/alerts/CriticalAlertBanner';
import LLMInsight from '../components/ui/LLMInsight';
import EmptyState from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';

const CHART = {
  grid: chartColors.grid,
  tick: chartColors.tick,
};

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

function DeltaBadge({ value, suffix = ' pts' }) {
  if (value == null) return <span className="text-xs text-[var(--text-muted)]">-</span>;
  const positive = value > 0;
  const negative = value < 0;
  const Icon = positive ? TrendingUp : negative ? TrendingDown : Minus;
  const tone = positive
    ? 'text-[var(--status-critical)]'
    : negative
      ? 'text-[var(--status-success)]'
      : 'text-[var(--text-muted)]';
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold tabular-nums ${tone}`}>
      <Icon className="w-3 h-3" />
      {positive ? '+' : ''}
      {value}
      {suffix}
    </span>
  );
}

function MetricCard({ label, value, delta, hint, tone = 'default', icon: Icon }) {
  const toneClass = {
    default: 'text-[var(--text-primary)]',
    critical: 'text-[var(--status-critical)]',
    warning: 'text-[var(--status-warning)]',
    success: 'text-[var(--status-success)]',
  }[tone];

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-5">
      <div className="flex items-start justify-between mb-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">{label}</p>
        {Icon && <Icon className="w-4 h-4 text-[var(--text-muted)]" />}
      </div>
      <p className={`text-2xl font-bold tabular-nums ${toneClass}`}>{value}</p>
      <div className="flex items-center gap-2 mt-1">
        {delta !== undefined && <DeltaBadge value={delta} />}
        {hint && <span className="text-[10px] text-[var(--text-muted)]">{hint}</span>}
      </div>
    </div>
  );
}

function GlassCard({ label, data }) {
  const tone = data.rate >= 60 ? 'critical' : data.rate >= 30 ? 'warning' : 'success';
  const toneClass = {
    critical: 'text-[var(--status-critical)]',
    warning: 'text-[var(--status-warning)]',
    success: 'text-[var(--status-success)]',
  }[tone];
  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">{label}</p>
      <p className={`text-xl font-bold tabular-nums mt-1 ${toneClass}`}>{formatPercent(data.rate)}</p>
      <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
        {data.mdr} MDR of {data.samples} samples
      </p>
    </div>
  );
}

export default function NationalDashboard() {
  usePageTitle('National Dashboard');
  const [range, setRange] = useState(defaultRange);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [selectedCounty, setSelectedCounty] = useState(null);
  const { select: selectRegion, clear: clearRegion } = useRegionSelection();

  const qs = `start_date=${range.start_date}&end_date=${range.end_date}`;

  const summaryQuery = useQuery({
    queryKey: ['national-summary', qs],
    queryFn: () => getDashboardSummary(qs),
    staleTime: 60_000,
  });

  const trendQuery = useQuery({
    queryKey: ['national-trend', qs],
    queryFn: () => getMDRTrend(12, qs),
    staleTime: 60_000,
  });

  const pathogensQuery = useQuery({
    queryKey: ['national-pathogens', qs],
    queryFn: () => getResistanceByPathogen(10, qs),
    staleTime: 60_000,
  });

  const countiesQuery = useQuery({
    queryKey: ['national-top-counties', qs],
    queryFn: () => getTopCountiesWithTrend(8, qs),
    staleTime: 60_000,
  });

  const glassQuery = useQuery({
    queryKey: ['national-glass', qs],
    queryFn: () => getGlassIndicators(qs),
    staleTime: 60_000,
  });

  const alertsQuery = useQuery({
    queryKey: ['national-alerts'],
    queryFn: fetchAlerts,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const isLoading = summaryQuery.isLoading;

  const current = summaryQuery.data?.current || {};
  const previous = summaryQuery.data?.previous || null;
  const alerts = alertsQuery.data || [];

  const delta = (key) => {
    if (!previous || previous[key] == null || current[key] == null) return undefined;
    return Math.round((current[key] - previous[key]) * 10) / 10;
  };

  const trend = trendQuery.data || [];
  const pathogens = pathogensQuery.data || [];
  const counties = countiesQuery.data || [];
  const glass = glassQuery.data || null;

  return (
    <div className="space-y-5">
      {alerts.length > 0 && <CriticalAlertBanner alerts={alerts.filter((a) => a.severity === 'critical' && !a.resolved)} />}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">National AMR Surveillance</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            Republic of Kenya  -  population-level resistance overview
          </p>
        </div>
        <FreshnessIndicator />
      </div>

      <TimeScopeSelector value={range} onChange={setRange} />

      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 rounded-[var(--radius-card)]" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label="Total isolates" value={formatNumber(current.total_records)} delta={delta('total_records')} suffix="" hint="vs previous period" icon={Activity} />
          <MetricCard label="MDR rate" value={formatPercent(current.mdr_rate)} delta={delta('mdr_rate')} hint="vs previous period" tone={(current.mdr_rate ?? 0) >= 60 ? 'critical' : (current.mdr_rate ?? 0) >= 30 ? 'warning' : 'success'} icon={Beaker} />
          <MetricCard label="Active anomalies" value={formatNumber(current.anomaly_count)} delta={delta('anomaly_count')} suffix="" tone="warning" icon={AlertTriangle} />
          <MetricCard label="Reporting counties" value={formatNumber(current.active_counties)} delta={delta('active_counties')} suffix="" icon={Globe2} />
        </div>
      )}

      {!isLoading && summaryQuery.data && (
        <LLMInsight
          context="national summary"
          title="Epidemiological interpretation"
          data={{
            current,
            previous,
          }}
        />
      )}

      {glass && (
        <div className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">WHO GLASS priority pathogens</h3>
            <span className="text-xs text-[var(--text-muted)]">Aligned with national reporting</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <GlassCard label="E. coli" data={glass.e_coli} />
            <GlassCard label="Klebsiella pneumoniae" data={glass.klebsiella} />
            <GlassCard label="Staphylococcus aureus" data={glass.staph_aureus} />
          </div>
        </div>
      )}

      {/* Map + Alerts row */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        <div className="lg:col-span-3 space-y-4">
          <div className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-5 overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                Resistance heatmap
              </h3>
              <span className="text-xs text-[var(--text-muted)]">
                Sub-county MDR rate
              </span>
            </div>
            <div className="h-[420px] w-full min-h-0 rounded-lg overflow-hidden">
              <CountyChoroplethMap
                darkMode={false}
                mode="current"
                startDate={range.start_date}
                endDate={range.end_date}
                onCountyClick={async (props) => {
                  setSelectedCounty(props);
                  selectRegion(props.county);
                  try {
                    const detail = await getCountyDetail(props.county, qs);
                    setSelectedCounty((prev) => ({ ...prev, ...detail }));
                  } catch (e) { /* keep basic region */ }
                }}
              />
            </div>
          </div>

          <NationalCountyDrawer
            region={selectedCounty}
            onClose={() => { setSelectedCounty(null); clearRegion(); }}
          />

          <MapTimeSlider />
        </div>

        <div className="lg:col-span-1 space-y-4">
          <AlertFeedPanel
            alerts={alerts.slice(0, 8)}
            onAlertClick={(a) => setSelectedAlert(a.id)}
          />
          <AnomalySummary
            anomalies={alerts}
            onAnomalyClick={(a) => setSelectedAlert(a.id)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-5">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">MDR trend (12 months)</h3>
          {trend.length === 0 ? (
            <EmptyState title="No trend data" description="Try a wider date range." />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
                <XAxis dataKey="month" tick={axisTick} />
                <YAxis unit="%" domain={[0, 100]} tick={axisTick} />
                <Tooltip formatter={(v) => `${v}%`} contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="rate" stroke={chartColors.blue} strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-5">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Top pathogens</h3>
          {pathogens.length === 0 ? (
            <EmptyState title="No pathogen data" />
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(260, pathogens.length * 26)}>
              <BarChart data={pathogens} layout="vertical" margin={{ left: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
                <XAxis type="number" unit="%" domain={[0, 100]} tick={axisTick} />
                <YAxis type="category" dataKey="name" width={150} tick={axisTick} />
                <Tooltip formatter={(v) => `${v}%`} contentStyle={tooltipStyle} />
                <Bar dataKey="resistance" fill={chartColors.blue} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] overflow-hidden">
        <div className="px-5 py-3 border-b border-[var(--border-primary)] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Counties with highest MDR rate
          </h3>
          <span className="text-xs text-[var(--text-muted)]">Trend vs previous period</span>
        </div>
        {counties.length === 0 ? (
          <EmptyState title="No county data" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--bg-tertiary)]">
                <tr>
                  <th className="text-left px-5 py-2 font-semibold text-[var(--text-secondary)]">#</th>
                  <th className="text-left px-5 py-2 font-semibold text-[var(--text-secondary)]">County</th>
                  <th className="text-right px-5 py-2 font-semibold text-[var(--text-secondary)]">Samples</th>
                  <th className="text-right px-5 py-2 font-semibold text-[var(--text-secondary)]">MDR rate</th>
                  <th className="text-right px-5 py-2 font-semibold text-[var(--text-secondary)]">Change</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-primary)]">
                {counties.map((c, i) => (
                  <tr key={c.county} className="hover:bg-[var(--bg-tertiary)]/40">
                    <td className="px-5 py-2 text-[var(--text-muted)] tabular-nums">{i + 1}</td>
                    <td className="px-5 py-2 text-[var(--text-primary)] font-medium">{c.county}</td>
                    <td className="px-5 py-2 text-right tabular-nums text-[var(--text-secondary)]">{formatNumber(c.samples)}</td>
                    <td className="px-5 py-2 text-right tabular-nums font-bold text-[var(--text-primary)]">{formatPercent(c.mdr_rate)}</td>
                    <td className="px-5 py-2 text-right"><DeltaBadge value={c.delta} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {selectedAlert && (() => {
        const found = alerts.find((a) => a.id === selectedAlert);
        return found ? <AlertDetailDrawer alert={found} onClose={() => setSelectedAlert(null)} /> : null;
      })()}

    </div>
  );
}
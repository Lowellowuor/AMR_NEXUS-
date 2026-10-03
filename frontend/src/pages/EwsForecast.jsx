import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import {
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { usePageTitle } from '../hooks/usePageTitle';
import api from '../api/client';
import { Skeleton } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import { formatPercent } from '../lib/format';

const ALERT_THRESHOLD = 30.0;

export default function EwsForecast() {
  usePageTitle('Early Warning Forecast');
  const [county, setCounty] = useState('');

  const optionsQuery = useQuery({
    queryKey: ['ews', 'options'],
    queryFn: () => api.getOptions(),
    staleTime: 10 * 60 * 1000,
  });

  const params = county ? `county=${encodeURIComponent(county)}` : '';
  const forecastQuery = useQuery({
    queryKey: ['ews', 'forecast', county],
    queryFn: () => api.getForecast(params),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const data = forecastQuery.data;
  const history = data?.history ?? [];
  const forecast = data?.forecast ?? [];

  // Merge history and forecast into a single chart series.
  // History points have `rate`; forecast points have `predicted_mdr_rate`
  // and a confidence band.
  const chartData = [
    ...history.map((p) => ({
      month: p.month,
      rate: p.rate,
      samples: p.samples,
    })),
    ...forecast.map((p) => ({
      month: p.month,
      forecast: p.predicted_mdr_rate,
      forecastLow: p.lower,
      forecastHigh: p.upper,
    })),
  ];

  const lastForecast = forecast[forecast.length - 1];
  const lastHistory = history[history.length - 1];
  const direction =
    lastForecast && lastHistory
      ? lastForecast.predicted_mdr_rate - lastHistory.rate
      : 0;
  const crossesThreshold = forecast.some(
    (p) => p.predicted_mdr_rate >= ALERT_THRESHOLD,
  );

  const counties = optionsQuery.data?.counties ?? [];

  const insufficient =
    forecastQuery.isError &&
    (forecastQuery.error?.message || '').includes('Insufficient');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <ChartBarIcon className="h-6 w-6 text-[var(--accent-teal)]" />
            Early Warning Forecast
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Projected MDR rate based on up to 24 months of historical data.
            Alert threshold is {formatPercent(ALERT_THRESHOLD)}.
          </p>
        </div>
        <select
          value={county}
          onChange={(e) => setCounty(e.target.value)}
          className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-full px-4 py-2 text-sm"
        >
          <option value="">All counties</option>
          {counties.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {insufficient ? (
        <EmptyState
          title="Not enough historical data"
          description="A forecast requires at least 3 months of isolate data for the selected county. Collect more samples or remove the county filter."
          icon={ExclamationTriangleIcon}
        />
      ) : forecastQuery.isLoading ? (
        <div className="bg-[var(--bg-secondary)]/80 rounded-2xl p-5">
          <Skeleton className="h-80" />
        </div>
      ) : forecastQuery.isError ? (
        <EmptyState
          title="Could not load forecast"
          description={forecastQuery.error?.message || 'Try again later.'}
          icon={ExclamationTriangleIcon}
        />
      ) : chartData.length === 0 ? (
        <EmptyState
          title="No data to forecast"
          description="Once isolates exist with dates, the forecast will appear."
          icon={ChartBarIcon}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[var(--bg-secondary)]/80 rounded-2xl p-5">
              <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
                Latest observed
              </p>
              <p className="text-2xl font-bold text-[var(--text-primary)] tabular-nums mt-1">
                {lastHistory ? formatPercent(lastHistory.rate) : '—'}
              </p>
              {lastHistory && (
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  {lastHistory.month} · n={lastHistory.samples}
                </p>
              )}
            </div>
            <div className="bg-[var(--bg-secondary)]/80 rounded-2xl p-5">
              <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
                Forecast (+{forecast.length}m)
              </p>
              <p className="text-2xl font-bold text-[var(--text-primary)] tabular-nums mt-1">
                {lastForecast
                  ? formatPercent(lastForecast.predicted_mdr_rate)
                  : '—'}
              </p>
              {lastForecast && (
                <p className="text-xs text-[var(--text-muted)] mt-1 flex items-center gap-1">
                  {direction > 0 ? (
                    <>
                      <ArrowTrendingUpIcon className="w-3.5 h-3.5 text-[var(--status-critical)]" />
                      <span className="text-[var(--status-critical)]">
                        +{direction.toFixed(1)} pts
                      </span>
                    </>
                  ) : direction < 0 ? (
                    <>
                      <ArrowTrendingDownIcon className="w-3.5 h-3.5 text-[var(--status-success)]" />
                      <span className="text-[var(--status-success)]">
                        {direction.toFixed(1)} pts
                      </span>
                    </>
                  ) : (
                    'no change'
                  )}
                </p>
              )}
            </div>
            <div
              className={`rounded-2xl p-5 ${
                crossesThreshold
                  ? 'bg-[var(--status-critical-bg)]/40 border border-[var(--status-critical-border)]'
                  : 'bg-[var(--bg-secondary)]/80'
              }`}
            >
              <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
                Threshold
              </p>
              <p
                className={`text-2xl font-bold tabular-nums mt-1 ${
                  crossesThreshold
                    ? 'text-[var(--status-critical)]'
                    : 'text-[var(--text-primary)]'
                }`}
              >
                {formatPercent(ALERT_THRESHOLD)}
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                {crossesThreshold
                  ? 'Forecast crosses the alert threshold'
                  : 'Forecast stays below the threshold'}
              </p>
            </div>
          </div>

          <div className="bg-[var(--bg-secondary)]/80 rounded-2xl p-5">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
              Observed and forecast MDR rate
            </h2>
            <div style={{ height: 360 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--border-primary)"
                  />
                  <XAxis
                    dataKey="month"
                    stroke="var(--text-muted)"
                    style={{ fontSize: 11 }}
                  />
                  <YAxis
                    stroke="var(--text-muted)"
                    style={{ fontSize: 11 }}
                    tickFormatter={(v) => `${v}%`}
                    domain={[0, 'auto']}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--bg-secondary)',
                      border: '1px solid var(--border-primary)',
                      borderRadius: '8px',
                      fontSize: 12,
                    }}
                    formatter={(v, name) => {
                      if (v == null) return [null, null];
                      return [`${Number(v).toFixed(1)}%`, name];
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <ReferenceLine
                    y={ALERT_THRESHOLD}
                    stroke="var(--status-critical)"
                    strokeDasharray="4 4"
                    label={{
                      value: `Alert ${ALERT_THRESHOLD}%`,
                      position: 'right',
                      fill: 'var(--status-critical)',
                      fontSize: 11,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="forecastHigh"
                    stroke="none"
                    fill="var(--accent-teal)"
                    fillOpacity={0.12}
                    name="Forecast range"
                    isAnimationActive={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="forecastLow"
                    stroke="none"
                    fill="var(--bg-secondary)"
                    fillOpacity={1}
                    legendType="none"
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="rate"
                    name="Observed"
                    stroke="var(--text-primary)"
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="forecast"
                    name="Forecast"
                    stroke="var(--accent-teal)"
                    strokeWidth={2}
                    strokeDasharray="5 4"
                    dot={{ r: 3 }}
                    isAnimationActive={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-3">
              Confidence band derived from 95% residual interval
              {data?.band != null && ` (±${data.band.toFixed(1)} pts)`}.
              Forecast uses linear extrapolation on monthly aggregates.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
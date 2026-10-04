import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  BeakerIcon,
  ChartBarIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { usePageTitle } from '../hooks/usePageTitle';
import api from '../api/client';
import { Skeleton } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import { formatNumber, formatPercent } from '../lib/format';

const SECTOR_COLOR = {
  human: '#3b82f6',
  animal: '#f59e0b',
  environment: '#10b981',
};

const SECTOR_LABEL = {
  human: 'Human',
  animal: 'Animal',
  environment: 'Environment',
};

function SectorCard({ sector }) {
  const color = SECTOR_COLOR[sector.sector] || 'var(--accent-teal)';
  const hasAmu = sector.amu_quantity > 0;
  const hasIsolates = sector.isolates > 0;

  return (
    <div className="rounded-2xl border border-[var(--border-primary)]/40 bg-[var(--bg-secondary)]/80 p-5">
      <div className="flex items-center gap-2 mb-4">
        <span
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: color }}
        />
        <p className="font-semibold text-[var(--text-primary)]">
          {SECTOR_LABEL[sector.sector] || sector.sector}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
            AMU quantity
          </p>
          <p className="text-xl font-bold tabular-nums text-[var(--text-primary)] mt-1">
            {hasAmu ? formatNumber(sector.amu_quantity) : '—'}
          </p>
          <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
            {hasAmu ? `${sector.amu_records} records` : 'no data'}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
            MDR rate
          </p>
          <p
            className="text-xl font-bold tabular-nums mt-1"
            style={{ color: hasIsolates ? color : 'var(--text-muted)' }}
          >
            {hasIsolates ? formatPercent(sector.mdr_rate) : '—'}
          </p>
          <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
            {hasIsolates ? `${formatNumber(sector.isolates)} isolates` : 'no data'}
          </p>
        </div>
      </div>

      {hasAmu && hasIsolates && (
        <p className="mt-3 text-xs text-[var(--text-muted)] border-t border-[var(--border-primary)]/40 pt-3">
          {sector.quantity_per_isolate.toFixed(2)} quantity per isolate
        </p>
      )}
    </div>
  );
}

export default function AmuResistance() {
  usePageTitle('AMU and Resistance');
  const [county, setCounty] = useState('');

  const optionsQuery = useQuery({
    queryKey: ['amu-res-options'],
    queryFn: () => api.getOptions(),
    staleTime: 10 * 60 * 1000,
  });

  const params = county ? `county=${encodeURIComponent(county)}` : '';
  const query = useQuery({
    queryKey: ['amu-resistance', county],
    queryFn: () => api.getAmuResistanceCorrelation(params),
    staleTime: 5 * 60 * 1000,
  });

  const data = query.data;
  const sectors = data?.sectors ?? [];
  const counties = optionsQuery.data?.counties ?? [];

  const chartData = sectors.map((s) => ({
    sector: SECTOR_LABEL[s.sector] || s.sector,
    mdr: s.mdr_rate,
    color: SECTOR_COLOR[s.sector] || '#888',
  }));

  const correlationValue = data?.correlation;
  const correlationNote = data?.correlation_note;
  const withBoth = data?.sectors_with_both ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <BeakerIcon className="h-6 w-6 text-[var(--accent-teal)]" />
            AMU and Resistance
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1 max-w-2xl">
            Consumption of antimicrobials and observed MDR, side by side per
            sector. Descriptive, not causal.
          </p>
        </div>
        <select
          value={county}
          onChange={(e) => setCounty(e.target.value)}
          className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-full px-4 py-2 text-sm"
        >
          <option value="">All counties</option>
          {counties.map((c) => (
            <option key={c.code || c} value={c.code || c}>
              {c.name || c}
            </option>
          ))}
        </select>
      </div>

      {query.isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-40" />)}
        </div>
      ) : query.isError ? (
        <EmptyState
          icon={ExclamationTriangleIcon}
          title="Could not load correlation data"
          description={query.error?.message || 'Try again later.'}
        />
      ) : sectors.length === 0 ? (
        <EmptyState
          icon={ChartBarIcon}
          title="No sector data available"
          description="Once isolates and consumption records exist, this page shows the side-by-side view."
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {sectors.map((s) => (
              <SectorCard key={s.sector} sector={s} />
            ))}
          </div>

          <div className="rounded-2xl border border-[var(--border-primary)]/40 bg-[var(--bg-secondary)]/80 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-[var(--text-primary)]">
                  MDR rate by sector
                </h2>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Observed resistance, not predicted
                </p>
              </div>
            </div>
            <div style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
                  <XAxis dataKey="sector" stroke="var(--text-muted)" style={{ fontSize: 12 }} />
                  <YAxis
                    stroke="var(--text-muted)"
                    style={{ fontSize: 11 }}
                    tickFormatter={(v) => `${v}%`}
                    domain={[0, 100]}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--bg-secondary)',
                      border: '1px solid var(--border-primary)',
                      borderRadius: '8px',
                      fontSize: 12,
                    }}
                    formatter={(v) => [`${Number(v).toFixed(1)}%`, 'MDR rate']}
                  />
                  <Bar dataKey="mdr" radius={[6, 6, 0, 0]}>
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div
            className={`rounded-2xl border p-5 ${
              correlationValue != null
                ? 'border-[var(--accent-teal)]/30 bg-[var(--accent-teal)]/5'
                : 'border-[var(--status-warning-border)]/40 bg-[var(--status-warning-bg)]/10'
            }`}
          >
            <div className="flex items-start gap-3">
              <InformationCircleIcon className="w-5 h-5 text-[var(--text-muted)] flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-[var(--text-primary)]">
                  {correlationValue != null
                    ? `Pearson r = ${correlationValue.toFixed(2)} across ${withBoth} sectors`
                    : 'Correlation not yet computable'}
                </p>
                <p className="text-[var(--text-secondary)] mt-1">
                  {correlationNote}
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
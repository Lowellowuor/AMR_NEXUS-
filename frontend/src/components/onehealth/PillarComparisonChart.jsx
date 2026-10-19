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
import api from '../../api/client';
import { Skeleton } from '../ui/Skeleton';
import EmptyState from '../ui/EmptyState';
import { chartColors, tooltipStyle, axisTick } from '../../lib/chartTheme';
import { formatNumber } from '../../lib/format';

const SECTOR_COLOUR = {
  human: '#3b82f6',
  animal: '#f59e0b',
  poultry: '#f59e0b',
  livestock: '#d97706',
  environment: '#10b981',
};

export default function PillarComparisonChart() {
  const query = useQuery({
    queryKey: ['onehealth-pillar-activity'],
    queryFn: () => api.getOneHealthPillarActivity(),
    staleTime: 60_000,
  });

  if (query.isLoading) {
    return (
      <div className="rounded-2xl border border-[var(--border-primary)]/40 bg-[var(--bg-secondary)]/80 p-5">
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (query.isError || !query.data) return null;

  const sectors = query.data.sectors ?? [];
  if (sectors.length === 0) {
    return (
      <div className="rounded-2xl border border-[var(--border-primary)]/40 bg-[var(--bg-secondary)]/80 p-5">
        <EmptyState title="No sector data" />
      </div>
    );
  }

  const chartData = sectors.map((s) => ({
    sector: s.sector,
    label: s.sector.charAt(0).toUpperCase() + s.sector.slice(1),
    samples: s.samples,
    mdr_rate: s.mdr_rate,
  }));

  return (
    <div className="rounded-2xl border border-[var(--border-primary)]/40 bg-[var(--bg-secondary)]/80 p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-base font-semibold text-[var(--text-primary)]">
            Pillar comparison
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            MDR rate and sample volume across sectors ·{' '}
            {formatNumber(query.data.total_isolates)} isolates
          </p>
        </div>
      </div>
      <div style={{ height: 280 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
            <XAxis dataKey="label" tick={axisTick} />
            <YAxis
              unit="%"
              domain={[0, 100]}
              tick={axisTick}
              label={{ value: 'MDR rate', angle: -90, position: 'insideLeft', fill: 'var(--text-muted)', fontSize: 10 }}
            />
            <Tooltip
              formatter={(value) => [`${value}%`, 'MDR rate']}
              contentStyle={tooltipStyle}
            />
            <Bar dataKey="mdr_rate" name="MDR rate">
              {chartData.map((entry) => (
                <Cell
                  key={entry.sector}
                  fill={SECTOR_COLOUR[entry.sector] || 'var(--accent-teal)'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
import { useQuery } from '@tanstack/react-query';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import api from '../../api/client';
import { Skeleton } from '../ui/Skeleton';
import EmptyState from '../ui/EmptyState';
import { chartColors, tooltipStyle, axisTick } from '../../lib/chartTheme';

export default function TrendComparisonChart({ county, months = 12 }) {
  const query = useQuery({
    queryKey: ['county-trend-comparison', county, months],
    queryFn: () =>
      api.getCountyTrendComparison(county, `months=${months}`),
    enabled: !!county,
    staleTime: 60_000,
  });

  if (query.isLoading) return <Skeleton className="h-72" />;
  if (query.isError || !query.data) return null;

  const series = query.data.series ?? [];
  if (series.length === 0) {
    return (
      <EmptyState
        title="No trend data"
        description="Not enough submissions in this window."
      />
    );
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={series}>
        <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
        <XAxis dataKey="month" tick={axisTick} />
        <YAxis unit="%" domain={[0, 100]} tick={axisTick} />
        <Tooltip
          formatter={(value, name) => [`${value ?? '—'}%`, name]}
          contentStyle={tooltipStyle}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line
          type="monotone"
          dataKey="county_rate"
          name={`${county} county`}
          stroke={chartColors.blue}
          strokeWidth={2}
          dot={{ r: 3 }}
          connectNulls
        />
        <Line
          type="monotone"
          dataKey="national_rate"
          name="National"
          stroke={chartColors.gray || '#94a3b8'}
          strokeWidth={2}
          strokeDasharray="4 4"
          dot={{ r: 3 }}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { ChartBarIcon } from '@heroicons/react/24/outline';
import { Card } from '../../design-system';
import EmptyState from '../ui/EmptyState';
import { chartColors, tooltipStyle, axisTick } from '../../lib/chartTheme';
import { formatPercent } from '../../lib/format';

export default function MDRTrendMini({ trend }) {
  return (
    <Card className="p-5">
      <h3 className="text-md font-semibold text-[var(--text-primary)] mb-3">
        MDR Trend (last 6 months)
      </h3>
      {!trend || trend.length === 0 ? (
        <EmptyState
          icon={ChartBarIcon}
          title="Not enough data"
          description="Trend appears once we have isolates across multiple months."
        />
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={trend}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
            <XAxis dataKey="month" tick={axisTick} />
            <YAxis unit="%" domain={[0, 100]} tick={axisTick} />
            <Tooltip formatter={(v) => formatPercent(v)} contentStyle={tooltipStyle} />
            <Line
              type="monotone"
              dataKey="rate"
              stroke={chartColors.blue}
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}

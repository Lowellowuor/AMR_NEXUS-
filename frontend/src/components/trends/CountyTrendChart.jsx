import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AlertTriangle, Loader2 } from 'lucide-react';
import api from '../../api/client';

export default function CountyTrendChart({ county, months = 12 }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['county-mdr-trend', county, months],
    queryFn: () => {
      const params = county ? `county=${encodeURIComponent(county)}` : '';
      return api.getMDRTrend(months, params);
    },
  });

  if (isLoading) {
    return (
      <div className="card flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--accent-cyan)]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card flex items-center justify-center h-64 text-[var(--accent-red)] gap-2">
        <AlertTriangle className="w-5 h-5" />
        <span className="text-sm">Failed to load trend data</span>
      </div>
    );
  }

  const trend = data || [];
  const trendUp = trend.length > 1 && trend[trend.length - 1].rate > trend[0].rate;

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="font-semibold text-base text-[var(--text-primary)]">MDR Trend</h3>
          <p className="text-sm text-[var(--text-secondary)]">
            {county ? `${county} County` : 'National'} · Last {months} months
          </p>
        </div>
        <span className={`pill text-[10px] ${trendUp ? 'pill-red' : 'pill-teal'}`}>
          {trendUp ? '↑ Rising' : '↓ Falling'}
        </span>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={trend} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
            <YAxis unit="%" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
            <Tooltip formatter={(v) => `${v}%`} />
            <Line
              type="monotone"
              dataKey="rate"
              stroke="var(--accent-cyan)"
              strokeWidth={2.5}
              dot={{ r: 3, fill: 'var(--accent-cyan)' }}
              activeDot={{ r: 5, fill: 'var(--accent-cyan)', stroke: 'var(--bg-primary)', strokeWidth: 2 }}
              name="MDR Rate (%)"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AlertTriangle, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import api from '../../api/client';

const sectorColors = {
  human: '#0D9488',
  poultry: '#D97706',
  environment: '#059669',
};

function sectorInsight(sector, monthly) {
  if (!monthly || monthly.length < 2) return 'Insufficient data for trend analysis.';
  const first = monthly[0].rate;
  const last = monthly[monthly.length - 1].rate;
  const change = last - first;
  const direction = change > 0 ? 'increasing' : change < 0 ? 'decreasing' : 'stable';
  let text = `${sector} sector MDR rate is ${direction} (${first}% → ${last}%).`;
  if (sector === 'human') text += ' This may indicate hospital-associated transmission or antibiotic overuse in clinical settings.';
  else if (sector === 'poultry') text += ' This could be driven by antibiotic use in feed or poor biosecurity.';
  else if (sector === 'environment') text += ' Resistance in the environment may stem from wastewater contamination or agricultural runoff.';
  return text;
}

export default function SectorTrendChart({ months = 12 }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['sector-monthly', months],
    queryFn: () => api.getSectorMonthly(months),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--accent-cyan)]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-5 text-center text-red-500 flex items-center justify-center gap-2">
        <AlertTriangle className="w-5 h-5" />
        <span>Failed to load sector trends</span>
      </div>
    );
  }

  const sectors = data || [];

  if (sectors.length === 0) {
    return (
      <div className="card p-8 text-center text-[var(--text-muted)]">
        No sector data available.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {sectors.map((sectorData) => {
        const color = sectorColors[sectorData.sector] || '#3B82F6';
        const insight = sectorInsight(sectorData.sector, sectorData.monthly);

        return (
          <div key={sectorData.sector} className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-[var(--text-primary)] capitalize">
                {sectorData.sector} Sector
              </h3>
              <span className="pill pill-slate text-[10px]">
                Last {sectorData.monthly.length} months
              </span>
            </div>

            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={sectorData.monthly} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <YAxis unit="%" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <Tooltip formatter={(v) => `${v}%`} />
                <Line
                  type="monotone"
                  dataKey="rate"
                  stroke={color}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="MDR Rate"
                />
              </LineChart>
            </ResponsiveContainer>

            <div className="mt-3 p-3 rounded-lg bg-[var(--bg-tertiary)] text-xs text-[var(--text-secondary)]">
              {insight}
            </div>
          </div>
        );
      })}
    </div>
  );
}
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { formatNumber, formatPercent } from '../../lib/format';

const CHART = {
  grid: 'var(--border-primary)',
  tick: 'var(--text-muted)',
  tooltip: {
    backgroundColor: 'var(--bg-elevated)',
    border: '1px solid var(--border-primary)',
    borderRadius: 10,
    color: 'var(--text-primary)',
    fontSize: 12,
  },
};

export default function PathogenTrendsTab({ data }) {
  const trend = data.trend || [];
  const s = data.summary;

  if (trend.length === 0) {
    return (
      <div className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-8 text-center">
        <p className="text-sm text-[var(--text-muted)]">No trend data available.</p>
      </div>
    );
  }

  const peak = trend.reduce((m, r) => (r.rate > m.rate ? r : m), trend[0]);
  const trough = trend.reduce((m, r) => (r.rate < m.rate ? r : m), trend[0]);
  const totalSamples = trend.reduce((sum, r) => sum + r.samples, 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Total samples</p>
          <p className="text-2xl font-bold tabular-nums text-[var(--text-primary)] mt-1">{formatNumber(totalSamples)}</p>
        </div>
        <div className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Peak month</p>
          <p className="text-2xl font-bold tabular-nums text-[var(--status-critical)] mt-1">{formatPercent(peak.rate)}</p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">{peak.month}</p>
        </div>
        <div className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Trough month</p>
          <p className="text-2xl font-bold tabular-nums text-[var(--status-success)] mt-1">{formatPercent(trough.rate)}</p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">{trough.month}</p>
        </div>
        <div className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Overall</p>
          <p className="text-2xl font-bold tabular-nums text-[var(--text-primary)] mt-1">{formatPercent(s.mdr_rate)}</p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">across all periods</p>
        </div>
      </div>

      <div className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-5">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">MDR rate by month</h3>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={trend}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: CHART.tick }} />
            <YAxis unit="%" domain={[0, 100]} tick={{ fontSize: 11, fill: CHART.tick }} />
            <Tooltip formatter={(v, n, p) => `${v}% (n=${p.payload.samples})`} contentStyle={CHART.tooltip} />
            <Line type="monotone" dataKey="rate" stroke="var(--accent-blue)" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-5">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Sample volume by month</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={trend}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: CHART.tick }} />
            <YAxis tick={{ fontSize: 11, fill: CHART.tick }} />
            <Tooltip contentStyle={CHART.tooltip} />
            <Bar dataKey="samples" fill="var(--accent-teal)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

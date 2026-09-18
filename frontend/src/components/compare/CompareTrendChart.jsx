import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { chartColors, tooltipStyle, axisTick } from '../../lib/chartTheme';

export default function CompareTrendChart({ a, b, labelA, labelB }) {
  const maxMonth = Math.max(...a.map((r) => r.month), ...b.map((r) => r.month), 0);

  const data = [];
  for (let m = 1; m <= maxMonth; m++) {
    const ar = a.find((x) => x.month === m);
    const br = b.find((x) => x.month === m);
    data.push({ label: `M${m}`, a: ar?.rate ?? null, b: br?.rate ?? null });
  }

  if (data.length === 0) {
    return (
      <div className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-5">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Trend comparison</h3>
        <p className="text-xs text-[var(--text-muted)]">No trend data available.</p>
      </div>
    );
  }

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Trend comparison</h3>
        <div className="flex items-center gap-4 text-xs">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-3 h-0.5 rounded-full" style={{ background: chartColors.blue }} />
            <span className="text-[var(--text-muted)]">{labelA}</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block w-3 h-0.5 rounded-full" style={{ background: chartColors.amber }} />
            <span className="text-[var(--text-muted)]">{labelB}</span>
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
          <XAxis dataKey="label" tick={axisTick} />
          <YAxis unit="%" domain={[0, 100]} tick={axisTick} />
          <Tooltip formatter={(v) => v == null ? '-' : `${v}%`} contentStyle={tooltipStyle} />
          <Line type="monotone" dataKey="a" stroke={chartColors.blue} strokeWidth={2} dot={{ r: 3 }} connectNulls />
          <Line type="monotone" dataKey="b" stroke={chartColors.amber} strokeWidth={2} dot={{ r: 3 }} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

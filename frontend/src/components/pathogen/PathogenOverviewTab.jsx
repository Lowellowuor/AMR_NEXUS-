import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Beaker, TrendingUp, TrendingDown, Layers } from 'lucide-react';
import { formatNumber, formatPercent } from '../../lib/format';
import { toneForRate } from '../../lib/pathogenConfig';

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

function Metric({ label, value, hint, tone = 'default' }) {
  const toneClass = {
    default: 'text-[var(--text-primary)]',
    critical: 'text-[var(--status-critical)]',
    warning: 'text-[var(--status-warning)]',
    success: 'text-[var(--status-success)]',
  }[tone];

  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-[var(--radius-card)] p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">{label}</p>
      <p className={`text-2xl font-bold tabular-nums mt-1 ${toneClass}`}>{value}</p>
      {hint && <p className="text-xs text-[var(--text-muted)] mt-1">{hint}</p>}
    </div>
  );
}

export default function PathogenOverviewTab({ data, onTabChange }) {
  const s = data.summary;
  const trend = data.trend || [];
  const byClass = (data.by_class || []).slice(0, 5);
  const tone = toneForRate(s.mdr_rate);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Metric label="Samples" value={formatNumber(s.samples)} hint="Matching current filters" />
        <Metric label="MDR rate" value={formatPercent(s.mdr_rate)} hint={`95% CI ${s.ci_low}–${s.ci_high}%`} tone={tone} />
        <Metric label="MDR isolates" value={formatNumber(s.mdr_count)} hint={`of ${formatNumber(s.samples)} total`} />
        <Metric
          label="Change"
          value={s.change == null ? '—' : `${s.change > 0 ? '+' : ''}${s.change} pts`}
          hint={s.previous_rate != null ? `Prev: ${s.previous_rate}%` : 'No previous period data'}
          tone={s.change == null ? 'default' : s.change > 0 ? 'critical' : 'success'}
        />
      </div>

      {trend.length > 1 && (
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-[var(--radius-card)] p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[var(--accent-teal)]" />
              MDR rate over time
            </h3>
            <button onClick={() => onTabChange?.('trends')} className="text-xs text-[var(--accent-teal)] hover:underline">
              Full view →
            </button>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: CHART.tick }} />
              <YAxis unit="%" domain={[0, 100]} tick={{ fontSize: 11, fill: CHART.tick }} />
              <Tooltip formatter={(v) => `${v}%`} contentStyle={CHART.tooltip} />
              <Line type="monotone" dataKey="rate" stroke="var(--accent-blue)" strokeWidth={2} dot={{ r: 3 }} name="MDR rate" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {byClass.length > 0 && (
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-[var(--radius-card)] p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <Beaker className="w-4 h-4 text-[var(--accent-teal)]" />
              Top 5 antibiotic classes by resistance
            </h3>
            <button onClick={() => onTabChange?.('resistance')} className="text-xs text-[var(--accent-teal)] hover:underline">
              Full breakdown →
            </button>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={byClass} layout="vertical" margin={{ left: 40, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
              <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fontSize: 11, fill: CHART.tick }} />
              <YAxis type="category" dataKey="antibiotic_class" width={140} tick={{ fontSize: 11, fill: CHART.tick }} />
              <Tooltip
                formatter={(v, n, p) => `${v}% (n=${p.payload.samples}, CI ${p.payload.ci_low}-${p.payload.ci_high}%)`}
                contentStyle={CHART.tooltip}
              />
              <Bar dataKey="resistance" fill="var(--accent-blue)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {(data.by_sector?.length || 0) > 0 && (
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-[var(--radius-card)] p-5">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2 mb-3">
            <Layers className="w-4 h-4 text-[var(--accent-teal)]" />
            Sector distribution
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {data.by_sector.map((sec) => (
              <div key={sec.sector} className="rounded-lg border border-[var(--border-primary)] p-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] capitalize">{sec.sector}</p>
                <p className="text-lg font-bold tabular-nums text-[var(--text-primary)] mt-1">{formatPercent(sec.mdr_rate)}</p>
                <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{formatNumber(sec.samples)} samples</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

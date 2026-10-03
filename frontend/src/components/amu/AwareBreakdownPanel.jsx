import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';
import { ShieldCheckIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import api from '../../api/client';
import { Skeleton } from '../ui/Skeleton';
import EmptyState from '../ui/EmptyState';
import { formatNumber, formatPercent } from '../../lib/format';

const CATEGORY_META = {
  Access: { colour: '#10b981', label: 'Access' },
  Watch: { colour: '#f59e0b', label: 'Watch' },
  Reserve: { colour: '#dc2626', label: 'Reserve' },
};

export default function AwareBreakdownPanel({ county, sector }) {
  const params = new URLSearchParams();
  if (county) params.set('county', county);
  if (sector) params.set('sector', sector);
  const qs = params.toString();

  const query = useQuery({
    queryKey: ['amu-aware', qs],
    queryFn: () => api.getAmuAwareBreakdown(qs),
    staleTime: 60_000,
  });

  const data = query.data;

  if (query.isLoading) {
    return (
      <div className="bg-[var(--bg-secondary)]/80 rounded-2xl p-5">
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (query.isError || !data || data.total_records === 0) {
    return (
      <div className="bg-[var(--bg-secondary)]/80 rounded-2xl p-5">
        <EmptyState
          title="No consumption data for AWaRe analysis"
          description="Add consumption records to see WHO Access / Watch / Reserve classification."
        />
      </div>
    );
  }

  const chartData = ['Access', 'Watch', 'Reserve'].map((cat) => ({
    category: cat,
    quantity: data.totals[cat] ?? 0,
    percent: data[`${cat.toLowerCase()}_percent`] ?? 0,
    records: data.records[cat] ?? 0,
  }));

  const accessBelowTarget = data.access_percent < data.who_target_access_percent;
  const gap = data.who_target_access_percent - data.access_percent;

  return (
    <div className="bg-[var(--bg-secondary)]/80 rounded-2xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <ShieldCheckIcon className="h-5 w-5 text-[var(--accent-teal)]" />
          <div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              WHO AWaRe classification
            </h2>
            <p className="text-xs text-[var(--text-muted)]">
              Access / Watch / Reserve split of consumption quantity
            </p>
          </div>
        </div>
        <div
          className="flex items-center gap-1 text-xs text-[var(--text-muted)]"
          title="WHO 2023 target: at least 60% of antibiotic consumption should be Access-tier drugs."
        >
          <InformationCircleIcon className="h-3.5 w-3.5" />
          <span>WHO target: ≥{data.who_target_access_percent}% Access</span>
        </div>
      </div>

      {/* Access % headline */}
      <div
        className={`rounded-xl p-4 mb-4 border ${
          accessBelowTarget
            ? 'border-[var(--status-warning-border)]/40 bg-[var(--status-warning-bg)]/10'
            : 'border-[var(--status-success-border)]/40 bg-[var(--status-success-bg)]/10'
        }`}
      >
        <div className="flex items-baseline justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
              Access share
            </p>
            <p
              className={`text-3xl font-bold tabular-nums mt-1 ${
                accessBelowTarget
                  ? 'text-[var(--status-warning)]'
                  : 'text-[var(--status-success)]'
              }`}
            >
              {formatPercent(data.access_percent)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-[var(--text-muted)]">Target</p>
            <p className="text-lg font-semibold tabular-nums text-[var(--text-primary)]">
              {data.who_target_access_percent}%
            </p>
            {accessBelowTarget && (
              <p className="text-xs text-[var(--status-warning)] mt-1">
                {gap.toFixed(1)} pts below
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Bar chart */}
      <div style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
            <XAxis
              dataKey="category"
              stroke="var(--text-muted)"
              style={{ fontSize: 12 }}
            />
            <YAxis
              stroke="var(--text-muted)"
              style={{ fontSize: 11 }}
              tickFormatter={(v) => formatNumber(v)}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-primary)',
                borderRadius: '8px',
                fontSize: 12,
              }}
              formatter={(value, name, entry) => {
                if (name === 'quantity') {
                  return [
                    `${formatNumber(value)} (${formatPercent(entry.payload.percent)})`,
                    'Quantity',
                  ];
                }
                return [value, name];
              }}
            />
            <ReferenceLine
              y={data.totals.Access / Math.max(1, data.access_percent / 100)}
              stroke="var(--text-muted)"
              strokeDasharray="4 4"
              label={{ value: 'target', position: 'right', fontSize: 10 }}
            />
            <Bar dataKey="quantity" radius={[6, 6, 0, 0]}>
              {chartData.map((entry) => (
                <Cell
                  key={entry.category}
                  fill={CATEGORY_META[entry.category].colour}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Breakdown table */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        {chartData.map((row) => (
          <div
            key={row.category}
            className="rounded-lg border border-[var(--border-primary)]/40 p-3"
          >
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: CATEGORY_META[row.category].colour }}
              />
              <p className="text-xs font-medium text-[var(--text-secondary)]">
                {row.category}
              </p>
            </div>
            <p className="text-lg font-bold tabular-nums text-[var(--text-primary)] mt-1">
              {formatPercent(row.percent)}
            </p>
            <p className="text-[10px] text-[var(--text-muted)] tabular-nums">
              {formatNumber(row.quantity)} · {row.records} records
            </p>
          </div>
        ))}
      </div>

      <p className="text-xs text-[var(--text-muted)] mt-4">
        Classification per WHO AWaRe 2023. Drugs missing a WHO category are
        excluded from the percentage calculation.
      </p>
    </div>
  );
}
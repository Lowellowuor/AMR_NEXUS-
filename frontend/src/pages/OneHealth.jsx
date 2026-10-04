import { useQuery } from '@tanstack/react-query';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  HeartIcon,
  GlobeAltIcon,
  BeakerIcon,
  ArrowRightIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import { usePageTitle } from '../hooks/usePageTitle';
import api from '../api/client';
import { Skeleton } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import { formatNumber, formatPercent } from '../lib/format';
import EcoliSentinelPanel from '../components/onehealth/EcoliSentinelPanel';
import CrossPillarSignals from '../components/onehealth/CrossPillarSignals';

const PILLARS = [
  {
    key: 'human',
    label: 'Human',
    icon: HeartIcon,
    color: '#3b82f6',
    blurb: 'Hospitals, clinics, laboratories',
    analyticsFilter: '/analytics?sector=human',
    historyFilter: '/history?sector=human',
  },
  {
    key: 'animal',
    label: 'Animal',
    icon: BeakerIcon,
    color: '#f59e0b',
    blurb: 'Farms, abattoirs, veterinary services',
    analyticsFilter: '/analytics?sector=animal',
    historyFilter: '/history?sector=animal',
  },
  {
    key: 'environment',
    label: 'Environment',
    icon: GlobeAltIcon,
    color: '#10b981',
    blurb: 'Soil, water, food safety',
    analyticsFilter: '/analytics?sector=environment',
    historyFilter: '/history?sector=environment',
  },
];

function PillarCard({ pillar, summary, loading }) {
  const Icon = pillar.icon;
  const total = summary?.total_records ?? 0;
  const mdrRate = summary?.mdr_rate ?? 0;
  const anomalies = summary?.anomaly_count ?? 0;

  return (
    <div className="bg-[var(--bg-secondary)]/80 p-5 rounded-2xl border border-[var(--border-primary)]/40">
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ backgroundColor: `${pillar.color}20` }}
        >
          <Icon className="w-5 h-5" style={{ color: pillar.color }} />
        </div>
        <div>
          <p className="font-semibold text-[var(--text-primary)]">{pillar.label}</p>
          <p className="text-xs text-[var(--text-muted)]">{pillar.blurb}</p>
        </div>
      </div>

      {loading ? (
        <Skeleton className="h-20" />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
                Samples
              </p>
              <p className="text-xl font-bold text-[var(--text-primary)] tabular-nums">
                {formatNumber(total)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
                MDR rate
              </p>
              <p
                className="text-xl font-bold tabular-nums"
                style={{ color: pillar.color }}
              >
                {formatPercent(mdrRate)}
              </p>
            </div>
          </div>

          {anomalies > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-[var(--status-warning)] mb-3">
              <ExclamationTriangleIcon className="w-3.5 h-3.5" />
              <span>{anomalies} anomal{anomalies === 1 ? 'y' : 'ies'} flagged</span>
            </div>
          )}

          <div className="flex gap-2 mt-3">
            <Link
              to={pillar.historyFilter}
              className="text-xs px-3 py-1.5 rounded-full border border-[var(--border-primary)] hover:bg-[var(--bg-tertiary)]/60"
            >
              View records
            </Link>
            <Link
              to={pillar.analyticsFilter}
              className="text-xs px-3 py-1.5 rounded-full border border-[var(--border-primary)] hover:bg-[var(--bg-tertiary)]/60"
            >
              Analytics
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

export default function OneHealth() {
  usePageTitle('One Health Overview');

  const humanQ = useQuery({
    queryKey: ['onehealth', 'human'],
    queryFn: () => api.getSummary('sector=human'),
  });
  const animalQ = useQuery({
    queryKey: ['onehealth', 'animal'],
    queryFn: () => api.getSummary('sector=animal'),
  });
  const environmentQ = useQuery({
    queryKey: ['onehealth', 'environment'],
    queryFn: () => api.getSummary('sector=environment'),
  });

  const monthlyQ = useQuery({
    queryKey: ['onehealth', 'sector-monthly'],
    queryFn: () => api.getSectorMonthly(12),
  });

  const loading =
    humanQ.isLoading || animalQ.isLoading || environmentQ.isLoading;
  const summaries = {
    human: humanQ.data,
    animal: animalQ.data,
    environment: environmentQ.data,
  };

  // Build combined monthly trend for all three sectors
  const combinedTrend = (() => {
    const rows = monthlyQ.data ?? [];
    const byMonth = {};
    for (const row of rows) {
      for (const m of row.monthly ?? []) {
        if (!byMonth[m.month]) byMonth[m.month] = { month: m.month };
        byMonth[m.month][row.sector] = m.rate;
      }
    }
    return Object.values(byMonth).sort((a, b) =>
      a.month < b.month ? -1 : a.month > b.month ? 1 : 0,
    );
  })();

  const totalSamples =
    (humanQ.data?.total_records ?? 0) +
    (animalQ.data?.total_records ?? 0) +
    (environmentQ.data?.total_records ?? 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          One Health Overview
        </h1>
        <p className="text-sm text-[var(--text-muted)] mt-1 max-w-2xl">
          Antimicrobial resistance does not respect sector boundaries. This
          view brings human, animal, and environmental data together so cross-
          pillar patterns become visible.
        </p>
      </div>

      {totalSamples === 0 && !loading && (
        <EmptyState
          title="No sector data yet"
          description="Once isolates are submitted from human, animal, and environmental sources, they will appear here."
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PILLARS.map((p) => (
          <PillarCard
            key={p.key}
            pillar={p}
            summary={summaries[p.key]}
            loading={loading}
          />
        ))}
      </div>

      <EcoliSentinelPanel />

      <CrossPillarSignals />

      <div className="bg-[var(--bg-secondary)]/80 p-5 rounded-2xl border border-[var(--border-primary)]/40">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            MDR trend by sector
          </h2>
          <span className="text-xs text-[var(--text-muted)]">
            last 12 months
          </span>
        </div>
        {monthlyQ.isLoading ? (
          <Skeleton className="h-64" />
        ) : combinedTrend.length === 0 ? (
          <EmptyState
            title="No monthly trend yet"
            description="Collect isolates with sample dates to see the trend."
          />
        ) : (
          <div style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={combinedTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
                <XAxis
                  dataKey="month"
                  stroke="var(--text-muted)"
                  style={{ fontSize: 11 }}
                />
                <YAxis
                  stroke="var(--text-muted)"
                  style={{ fontSize: 11 }}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-primary)',
                    borderRadius: '8px',
                    fontSize: 12,
                  }}
                  formatter={(v) => `${v}%`}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line
                  type="monotone"
                  dataKey="human"
                  name="Human"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="animal"
                  name="Animal"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="environment"
                  name="Environment"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-[var(--border-primary)]/40 bg-[var(--bg-secondary)]/60 p-5">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">
          Where to act
        </h3>
        <p className="text-sm text-[var(--text-secondary)] mb-4">
          Sectors with the highest MDR rates or the most anomalies warrant
          investigation first. Use the links above to drill into each pillar.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/amu"
            className="inline-flex items-center gap-1 text-sm px-4 py-2 rounded-full border border-[var(--border-primary)] hover:bg-[var(--bg-tertiary)]/60"
          >
            Antimicrobial Use
            <ArrowRightIcon className="w-3.5 h-3.5" />
          </Link>
          <Link
            to="/sampling-sites"
            className="inline-flex items-center gap-1 text-sm px-4 py-2 rounded-full border border-[var(--border-primary)] hover:bg-[var(--bg-tertiary)]/60"
          >
            Sampling Sites
            <ArrowRightIcon className="w-3.5 h-3.5" />
          </Link>
          <Link
            to="/alerts"
            className="inline-flex items-center gap-1 text-sm px-4 py-2 rounded-full border border-[var(--border-primary)] hover:bg-[var(--bg-tertiary)]/60"
          >
            Alerts
            <ArrowRightIcon className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
import {
  ChartBarIcon, ArrowTrendingUpIcon, BellIcon, MapPinIcon,
} from '@heroicons/react/24/outline';
import { formatNumber, formatPercent } from '../../lib/format';

const mdrTone = (rate) => {
  if (rate >= 60) return 'text-[var(--status-critical)]';
  if (rate >= 30) return 'text-[var(--status-warning)]';
  return 'text-[var(--status-success)]';
};

const Card = ({ label, value, hint, icon: Icon, valueClass = 'text-[var(--text-primary)]' }) => (
  <div className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-[var(--radius-card)] shadow-[var(--shadow-sm)] p-5">
    <div className="flex justify-between items-start">
      <p className="text-sm text-[var(--text-muted)]">{label}</p>
      <Icon className="h-5 w-5 text-[var(--text-muted)]" />
    </div>
    <p className={`text-2xl font-bold mt-1 tabular-nums ${valueClass}`}>{value}</p>
    {hint && <p className="text-xs text-[var(--text-muted)] mt-1">{hint}</p>}
  </div>
);

export default function MetricsCards({ summary, anomalyCount }) {
  const mdrRate = summary?.mdr_rate ?? null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card
        label="Total Records"
        value={formatNumber(summary?.total_records)}
        hint="Lifetime isolates"
        icon={ChartBarIcon}
      />
      <Card
        label="MDR Rate"
        value={formatPercent(mdrRate)}
        hint="Multidrug-resistant proportion"
        icon={ArrowTrendingUpIcon}
        valueClass={mdrTone(mdrRate ?? 0)}
      />
      <Card
        label="Active Alerts"
        value={formatNumber(anomalyCount)}
        hint="Unusual resistance patterns"
        icon={BellIcon}
        valueClass="text-[var(--status-warning)]"
      />
      <Card
        label="Active Counties"
        value={formatNumber(summary?.active_counties)}
        hint="Reporting sites"
        icon={MapPinIcon}
        valueClass="text-[var(--accent-teal)]"
      />
    </div>
  );
}

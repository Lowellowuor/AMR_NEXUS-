import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ShieldCheckIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import api from '../../api/client';
import { Skeleton } from '../ui/Skeleton';

function rateTone(percent) {
  if (percent >= 50) return 'critical';
  if (percent >= 20) return 'warning';
  return 'success';
}

const TONE_CLASSES = {
  critical: {
    bar: 'bg-[var(--status-critical)]',
    text: 'text-[var(--status-critical)]',
    border: 'border-[var(--status-critical-border)]/40',
  },
  warning: {
    bar: 'bg-[var(--status-warning)]',
    text: 'text-[var(--status-warning)]',
    border: 'border-[var(--status-warning-border)]/40',
  },
  success: {
    bar: 'bg-[var(--status-success)]',
    text: 'text-[var(--status-success)]',
    border: 'border-[var(--status-success-border)]/40',
  },
};

function IndicatorCard({ indicator, onClick }) {
  const tone = rateTone(indicator.percent);
  const cls = TONE_CLASSES[tone];

  // CI bar: normalise low/high on a 0-100 scale
  const ciLeft = Math.max(0, indicator.ci_low);
  const ciWidth = Math.max(2, indicator.ci_high - indicator.ci_low);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left rounded-xl border bg-[var(--bg-secondary)]/80 p-4 hover:bg-[var(--bg-tertiary)]/40 transition ${cls.border}`}
    >
      <p className="text-[11px] font-medium text-[var(--text-muted)] truncate">
        {indicator.label}
      </p>
      <div className="mt-2 flex items-baseline gap-2">
        <p className={`text-2xl font-bold tabular-nums ${cls.text}`}>
          {indicator.percent.toFixed(1)}%
        </p>
        <p className="text-xs text-[var(--text-muted)] tabular-nums">
          n={indicator.samples}
        </p>
      </div>
      <div className="mt-3 relative h-1.5 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
        <div
          className={`absolute h-full rounded-full ${cls.bar} opacity-30`}
          style={{ left: `${ciLeft}%`, width: `${ciWidth}%` }}
        />
        <div
          className={`absolute h-full rounded-full ${cls.bar}`}
          style={{ left: `${indicator.percent}%`, width: '2px' }}
        />
      </div>
      <p className="mt-1.5 text-[10px] text-[var(--text-muted)] tabular-nums">
        95% CI {indicator.ci_low.toFixed(1)}–{indicator.ci_high.toFixed(1)}%
      </p>
    </button>
  );
}

export default function GlassIndicatorStrip({ county }) {
  const navigate = useNavigate();

  const params = county && county !== 'national' ? `county=${encodeURIComponent(county)}` : '';
  const query = useQuery({
    queryKey: ['glass-indicators', county],
    queryFn: () => api.getGlassIndicators(params),
    staleTime: 5 * 60 * 1000,
  });

  const indicators = query.data?.indicators ?? [];
  const summary = query.data?.summary ?? {};

  if (query.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-4 w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}
        </div>
      </div>
    );
  }

  if (query.isError || indicators.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheckIcon className="h-5 w-5 text-[var(--accent-teal)]" />
          <h2 className="text-base font-semibold text-[var(--text-primary)]">
            WHO GLASS indicators
          </h2>
          <span className="text-xs text-[var(--text-muted)]">
            last {summary.days} days
            {summary.county ? ` · ${summary.county}` : ' · national'}
            {' · '}
            {summary.total_samples.toLocaleString()} isolates
          </span>
        </div>
        <div
          className="flex items-center gap-1 text-xs text-[var(--text-muted)]"
          title="Resistance proxy: fraction of isolates tested against the class that were multidrug-resistant overall. Populate sir_result to report true class-level resistance."
        >
          <InformationCircleIcon className="h-3.5 w-3.5" />
          <span>MDR proxy</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {indicators.map((ind) => (
          <IndicatorCard
            key={ind.id}
            indicator={ind}
            onClick={() =>
              navigate(
                `/history?pathogen=${encodeURIComponent(ind.pathogen_code)}` +
                  `&antibiotic=${encodeURIComponent(ind.antibiotic_class)}`
              )
            }
          />
        ))}
      </div>
    </section>
  );
}
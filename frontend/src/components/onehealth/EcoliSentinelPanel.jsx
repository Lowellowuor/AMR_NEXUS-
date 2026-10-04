import { useQuery } from '@tanstack/react-query';
import {
  HeartIcon,
  BeakerIcon,
  GlobeAltIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import api from '../../api/client';
import { Skeleton } from '../ui/Skeleton';
import EmptyState from '../ui/EmptyState';
import { formatNumber, formatPercent } from '../../lib/format';

const SECTOR_ICON = {
  human: HeartIcon,
  animal: BeakerIcon,
  environment: GlobeAltIcon,
};

const SECTOR_COLOUR = {
  human: '#3b82f6',
  animal: '#f59e0b',
  environment: '#10b981',
};

const TONE_TEXT = {
  critical: 'text-[var(--status-critical)]',
  warning: 'text-[var(--status-warning)]',
  success: 'text-[var(--status-success)]',
};

function rateTone(rate) {
  if (rate >= 50) return 'critical';
  if (rate >= 30) return 'warning';
  return 'success';
}

export default function EcoliSentinelPanel({ county }) {
  const params = county ? `county=${encodeURIComponent(county)}` : '';
  const query = useQuery({
    queryKey: ['ecoli-sentinel', county],
    queryFn: () => api.getEcoliSentinel(params),
    staleTime: 5 * 60 * 1000,
  });

  if (query.isLoading) {
    return (
      <div className="rounded-2xl border border-[var(--border-primary)]/40 bg-[var(--bg-secondary)]/80 p-5">
        <Skeleton className="h-40" />
      </div>
    );
  }

  if (query.isError || !query.data) return null;

  const data = query.data;
  const sectors = data.sectors ?? [];
  const totalSamples = sectors.reduce((sum, s) => sum + s.samples, 0);

  if (totalSamples === 0) {
    return (
      <div className="rounded-2xl border border-[var(--border-primary)]/40 bg-[var(--bg-secondary)]/80 p-5">
        <EmptyState
          title={`No ${data.pathogen} isolates in scope`}
          description="Widen the period or remove the county filter."
        />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[var(--border-primary)]/40 bg-[var(--bg-secondary)]/80 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div>
          <h2 className="text-base font-semibold text-[var(--text-primary)]">
            {data.pathogen} across sectors
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            WHO sentinel organism for One Health surveillance
          </p>
        </div>
        <div className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
          <InformationCircleIcon className="h-3.5 w-3.5" />
          <span>
            {data.scope.days} days · {formatNumber(totalSamples)} isolates
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {sectors.map((s) => {
          const Icon = SECTOR_ICON[s.sector] || BeakerIcon;
          const colour = SECTOR_COLOUR[s.sector] || 'var(--accent-teal)';
          const tone = rateTone(s.mdr_rate);
          const hasData = s.samples > 0;

          return (
            <div
              key={s.sector}
              className="rounded-xl border border-[var(--border-primary)]/40 p-4"
            >
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="w-7 h-7 rounded-md flex items-center justify-center"
                  style={{ backgroundColor: `${colour}20` }}
                >
                  <Icon className="w-4 h-4" style={{ color: colour }} />
                </div>
                <p className="text-sm font-medium text-[var(--text-secondary)]">
                  {s.label}
                </p>
              </div>
              {hasData ? (
                <>
                  <p className={`text-2xl font-bold tabular-nums ${TONE_TEXT[tone]}`}>
                    {formatPercent(s.mdr_rate)}
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)] mt-1">
                    {formatNumber(s.mdr_count)} MDR of {formatNumber(s.samples)}
                  </p>
                </>
              ) : (
                <p className="text-sm text-[var(--text-muted)] mt-2">no data</p>
              )}
            </div>
          );
        })}
      </div>

      {data.sectors_with_data === 3 && (
        <p className="text-xs text-[var(--text-muted)] mt-4 border-t border-[var(--border-primary)]/40 pt-3">
          {data.pathogen} is present in all three sectors. Cross-sector resistance
          differences warrant investigation — the same organism can carry different
          resistance profiles in different compartments.
        </p>
      )}
    </div>
  );
}
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { GlobeAltIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import api from '../../api/client';
import { Skeleton } from '../ui/Skeleton';
import EmptyState from '../ui/EmptyState';
import { formatNumber, formatPercent } from '../../lib/format';

const SECTOR_COLOUR = {
  human: '#3b82f6',
  animal: '#f59e0b',
  environment: '#10b981',
};

export default function CrossPillarSignals({ county }) {
  const params = county ? `county=${encodeURIComponent(county)}` : '';
  const query = useQuery({
    queryKey: ['cross-pillar', county],
    queryFn: () => api.getCrossPillarSignals(params),
    staleTime: 5 * 60 * 1000,
  });

  if (query.isLoading) {
    return (
      <div className="rounded-2xl border border-[var(--border-primary)]/40 bg-[var(--bg-secondary)]/80 p-5">
        <Skeleton className="h-40" />
      </div>
    );
  }

  if (query.isError) return null;

  const signals = query.data?.signals ?? [];

  if (signals.length === 0) {
    return (
      <div className="rounded-2xl border border-[var(--border-primary)]/40 bg-[var(--bg-secondary)]/80 p-5">
        <EmptyState
          title="No cross-pillar signals"
          description="No pathogen currently appears in two or more sectors within the window."
          icon={GlobeAltIcon}
        />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[var(--border-primary)]/40 bg-[var(--bg-secondary)]/80 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-[var(--text-primary)]">
            Cross-pillar signals
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Pathogens appearing in two or more sectors in the last{' '}
            {query.data.scope.days} days
          </p>
        </div>
        <span className="text-xs text-[var(--text-muted)]">
          {signals.length} signal{signals.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="space-y-3">
        {signals.map((s) => (
          <div
            key={s.pathogen}
            className="rounded-xl border border-[var(--border-primary)]/40 p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="font-medium text-[var(--text-primary)]">
                  {s.pathogen}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
                  {s.sectors_present} sectors
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-[var(--text-muted)]">
                  {formatNumber(s.total_samples)} isolates
                </span>
                <span className="font-semibold tabular-nums text-[var(--text-primary)]">
                  {formatPercent(s.overall_mdr_rate)} MDR
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {s.sector_breakdown.map((b) => (
                <div
                  key={b.sector}
                  className="flex items-center justify-between text-xs px-3 py-1.5 rounded-lg bg-[var(--bg-primary)]/60"
                >
                  <span className="flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{
                        backgroundColor: SECTOR_COLOUR[b.sector] || '#888',
                      }}
                    />
                    <span className="text-[var(--text-secondary)]">{b.label}</span>
                  </span>
                  <span className="tabular-nums font-medium text-[var(--text-primary)]">
                    {formatPercent(b.mdr_rate)}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-3 flex justify-end">
              <Link
                to={`/history?pathogen=${encodeURIComponent(s.pathogen)}`}
                className="inline-flex items-center gap-1 text-xs text-[var(--accent-teal)] hover:underline"
              >
                Investigate
                <ArrowRightIcon className="w-3 h-3" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
import { useQuery } from '@tanstack/react-query';
import { BookOpenIcon } from '@heroicons/react/24/outline';
import api from '../../api/client';
import { Skeleton } from '../ui/Skeleton';

const SECTOR_COLOUR = {
  human: '#3b82f6',
  animal: '#f59e0b',
  environment: '#10b981',
};

export default function PillarDefinitions() {
  const query = useQuery({
    queryKey: ['onehealth-pillar-definitions'],
    queryFn: () => api.getOneHealthPillarDefinitions(),
    staleTime: 60 * 60 * 1000,
  });

  if (query.isLoading) {
    return (
      <div className="rounded-2xl border border-[var(--border-primary)]/40 bg-[var(--bg-secondary)]/80 p-5">
        <Skeleton className="h-24" />
      </div>
    );
  }

  if (query.isError || !query.data) return null;

  return (
    <div className="rounded-2xl border border-[var(--border-primary)]/40 bg-[var(--bg-secondary)]/80 p-5">
      <div className="flex items-center gap-2 mb-4">
        <BookOpenIcon className="w-4 h-4 text-[var(--text-muted)]" />
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">
          WHO One Health pillar definitions
        </h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {query.data.map((p) => {
          const colour = SECTOR_COLOUR[p.sector] || 'var(--accent-teal)';
          return (
            <div
              key={p.sector}
              className="rounded-xl border border-[var(--border-primary)]/40 p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: colour }}
                />
                <span className="text-sm font-semibold text-[var(--text-primary)]">
                  {p.label}
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                {p.definition}
              </p>
              <p className="text-[10px] text-[var(--text-muted)] mt-2">
                Source: {p.source}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
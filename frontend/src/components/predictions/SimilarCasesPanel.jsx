import { useQuery } from '@tanstack/react-query';
import { FileText, ChevronRight } from 'lucide-react';
import api from '../../api/client';
import { formatPercent, timeAgo } from '../../lib/format';

export default function SimilarCasesPanel({ pathogen, county, excludeRecordId, onSelect }) {
  const enabled = !!pathogen || !!county;

  const { data, isLoading } = useQuery({
    queryKey: ['similar-cases', pathogen, county],
    queryFn: () => {
      const p = new URLSearchParams();
      p.set('limit', '20');
      if (pathogen) p.set('pathogen', pathogen);
      if (county) p.set('county', county);
      return api.getPredictions(20, 0, p.toString());
    },
    enabled,
    staleTime: 60_000,
  });

  const list = Array.isArray(data) ? data : data?.records ?? [];
  const similar = list
    .filter((r) => r.record_id !== excludeRecordId)
    .slice(0, 4);

  if (!enabled || isLoading || similar.length === 0) return null;

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border-primary)]">
        <FileText className="w-4 h-4 text-[var(--text-muted)]" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Similar past cases
        </h3>
        <span className="text-xs text-[var(--text-muted)] ml-auto">
          {pathogen || 'any pathogen'}  -  {county || 'any county'}
        </span>
      </div>

      <ul className="divide-y divide-[var(--border-primary)]">
        {similar.map((r) => (
          <li key={r.record_id}>
            <button
              onClick={() => onSelect?.(r)}
              className="w-full text-left px-4 py-3 hover:bg-[var(--bg-tertiary)]/40 transition flex items-center justify-between gap-3 group"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-medium text-[var(--text-primary)] truncate">
                    {r.pathogen_code || 'Unnamed'}
                  </span>
                  {r.mdr_flag ? (
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--status-critical)] flex-shrink-0">
                      MDR
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--status-success)] flex-shrink-0">
                      Susceptible
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                  <span className="truncate">{r.county || '-'}</span>
                  <span> - </span>
                  <span className="tabular-nums flex-shrink-0">
                    {formatPercent((r.mdr_probability ?? 0) * 100)}
                  </span>
                  <span> - </span>
                  <span className="flex-shrink-0">{timeAgo(r.timestamp)}</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition flex-shrink-0" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

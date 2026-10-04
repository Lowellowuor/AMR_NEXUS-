import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ClockIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import api from '../../api/client';
import { formatPercent } from '../../lib/format';

export default function PriorPredictionsInCase({ caseId, excludeRecordId }) {
  const query = useQuery({
    queryKey: ['case', String(caseId)],
    queryFn: () => api.getCase(caseId),
    enabled: caseId != null,
    staleTime: 30_000,
  });

  if (caseId == null) return null;
  if (query.isLoading || query.isError || !query.data) return null;

  const c = query.data;
  const siblings = (c.isolates ?? []).filter(
    (r) => r.record_id !== excludeRecordId,
  );

  if (siblings.length === 0) return null;

  const sorted = [...siblings].sort((a, b) => {
    const ta = a.created_at || '';
    const tb = b.created_at || '';
    return tb.localeCompare(ta);
  });

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border-primary)]">
        <ClockIcon className="w-4 h-4 text-[var(--text-muted)]" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Prior predictions in this case
        </h3>
        <Link
          to={`/cases/${c.id}`}
          className="ml-auto inline-flex items-center gap-1 text-xs text-[var(--accent-teal)] hover:underline"
        >
          {c.case_code || 'View case'}
          <ArrowRightIcon className="w-3 h-3" />
        </Link>
      </div>

      <ul className="divide-y divide-[var(--border-primary)]/30">
        {sorted.map((r) => (
          <li
            key={r.record_id}
            className="px-4 py-2.5 flex items-center gap-3 text-xs"
          >
            <span className="flex-1 min-w-0 truncate text-[var(--text-primary)]">
              {r.pathogen_code || 'Unnamed'}
            </span>
            <span className="text-[var(--text-muted)] truncate">
              {r.specimen_type || '—'}
            </span>
            <span className="tabular-nums text-[var(--text-muted)]">
              {r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}
            </span>
            {r.mdr_flag ? (
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--status-critical)]">
                MDR
              </span>
            ) : (
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--status-success)]">
                Susceptible
              </span>
            )}
          </li>
        ))}
      </ul>

      <div className="px-4 py-2 bg-[var(--bg-primary)]/40 border-t border-[var(--border-primary)]/40 flex items-center justify-between text-[10px] text-[var(--text-muted)]">
        <span>
          {c.isolate_count} isolates · {formatPercent(c.mdr_rate)} case MDR rate
        </span>
      </div>
    </div>
  );
}
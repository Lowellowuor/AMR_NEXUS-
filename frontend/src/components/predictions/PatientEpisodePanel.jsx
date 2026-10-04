import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { FolderOpenIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import api from '../../api/client';
import { Skeleton } from '../ui/Skeleton';
import { formatNumber, formatPercent } from '../../lib/format';

export default function PatientEpisodePanel({ caseId, caseCode }) {
  const query = useQuery({
    queryKey: ['case', String(caseId)],
    queryFn: () => api.getCase(caseId),
    enabled: caseId != null,
    staleTime: 30_000,
  });

  if (caseId == null) {
    return (
      <div className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-4">
        <div className="flex items-center gap-2 mb-2">
          <FolderOpenIcon className="w-4 h-4 text-[var(--text-muted)]" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Patient episode
          </h3>
        </div>
        <p className="text-xs text-[var(--text-muted)]">
          This isolate was not grouped into a case. Cases form automatically
          when isolates share enough identifying signals (site, sector, species,
          and a 30-day window). Add those fields on submission to enable
          grouping, or link this isolate manually from the Cases page.
        </p>
      </div>
    );
  }

  if (query.isLoading) {
    return <Skeleton className="h-32" />;
  }

  if (query.isError || !query.data) return null;

  const c = query.data;
  const isolates = c.isolates ?? [];

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border-primary)]">
        <FolderOpenIcon className="w-4 h-4 text-[var(--accent-teal)]" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Patient episode
        </h3>
        <Link
          to={`/cases/${c.id}`}
          className="ml-auto inline-flex items-center gap-1 text-xs text-[var(--accent-teal)] hover:underline"
        >
          {c.case_code || caseCode || 'Open case'}
          <ArrowRightIcon className="w-3 h-3" />
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-3 px-4 py-3 border-b border-[var(--border-primary)]/40">
        <div>
          <p className="text-[10px] text-[var(--text-muted)]">Isolates</p>
          <p className="text-sm font-semibold text-[var(--text-primary)] tabular-nums">
            {formatNumber(c.isolate_count)}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-[var(--text-muted)]">MDR rate</p>
          <p className="text-sm font-semibold text-[var(--text-primary)] tabular-nums">
            {formatPercent(c.mdr_rate)}
          </p>
        </div>
        <div>
          <p className="text-[10px] text-[var(--text-muted)]">Status</p>
          <p className="text-sm font-semibold text-[var(--text-primary)] capitalize">
            {c.status}
          </p>
        </div>
      </div>

      <ul className="divide-y divide-[var(--border-primary)]/30">
        {isolates.slice(0, 6).map((r) => (
          <li key={r.record_id} className="px-4 py-2 text-xs flex items-center justify-between gap-2">
            <span className="text-[var(--text-primary)] truncate">
              {r.pathogen_code || 'Unnamed'}
            </span>
            <span className="text-[var(--text-muted)]">{r.specimen_type || '—'}</span>
            <span className="tabular-nums text-[var(--text-muted)]">
              {r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}
            </span>
          </li>
        ))}
        {isolates.length > 6 && (
          <li className="px-4 py-2 text-[10px] text-[var(--text-muted)] text-center">
            +{isolates.length - 6} more
          </li>
        )}
      </ul>
    </div>
  );
}
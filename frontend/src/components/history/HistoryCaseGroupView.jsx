import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRightIcon, ChevronDownIcon, FolderOpenIcon } from '@heroicons/react/24/outline';
import EmptyState from '../ui/EmptyState';
import { formatNumber, formatPercent } from '../../lib/format';

function statusOf(rate) {
  if (rate >= 50) return 'text-[var(--status-critical)]';
  if (rate >= 30) return 'text-[var(--status-warning)]';
  return 'text-[var(--status-success)]';
}

function CaseGroup({ caseId, caseCode, rows }) {
  const [open, setOpen] = useState(true);

  const total = rows.length;
  const mdr = rows.filter((r) => r.mdr_flag).length;
  const rate = total ? (mdr / total) * 100 : 0;
  const county = rows[0]?.county || '—';
  const sector = rows[0]?.sector || '—';
  const latest = rows.reduce((acc, r) => {
    if (!r.timestamp) return acc;
    return !acc || r.timestamp > acc ? r.timestamp : acc;
  }, null);

  return (
    <div className="border-b border-[var(--border-primary)] last:border-b-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-tertiary)]/40 text-left"
      >
        {open ? (
          <ChevronDownIcon className="w-4 h-4 text-[var(--text-muted)]" />
        ) : (
          <ChevronRightIcon className="w-4 h-4 text-[var(--text-muted)]" />
        )}
        <FolderOpenIcon className="w-4 h-4 text-[var(--accent-teal)]" />
        {caseCode ? (
          <Link
            to={`/cases/${caseId}`}
            onClick={(e) => e.stopPropagation()}
            className="font-medium text-[var(--accent-teal)] hover:underline tabular-nums"
          >
            {caseCode}
          </Link>
        ) : (
          <span className="font-medium text-[var(--text-muted)]">Ungrouped</span>
        )}
        <span className="text-xs text-[var(--text-muted)]">
          {county}{sector && sector !== '—' ? ` · ${sector}` : ''}
        </span>
        <span className="ml-auto flex items-center gap-4 text-xs">
          <span className="text-[var(--text-muted)]">
            {formatNumber(total)} isolate{total === 1 ? '' : 's'}
          </span>
          <span className={`tabular-nums font-semibold ${statusOf(rate)}`}>
            {formatPercent(rate)} MDR
          </span>
          <span className="text-[var(--text-muted)]">
            {latest ? new Date(latest).toLocaleDateString() : '—'}
          </span>
        </span>
      </button>
      {open && (
        <div className="bg-[var(--bg-primary)]/30 border-t border-[var(--border-primary)]/50">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left border-b border-[var(--border-primary)]/30">
                <th className="px-4 py-2 font-medium text-[var(--text-muted)]">Pathogen</th>
                <th className="px-4 py-2 font-medium text-[var(--text-muted)]">Specimen</th>
                <th className="px-4 py-2 font-medium text-[var(--text-muted)]">Sub-county</th>
                <th className="px-4 py-2 font-medium text-[var(--text-muted)]">MDR</th>
                <th className="px-4 py-2 font-medium text-[var(--text-muted)]">Probability</th>
                <th className="px-4 py-2 font-medium text-[var(--text-muted)]">Collected</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.record_id} className="border-b border-[var(--border-primary)]/20">
                  <td className="px-4 py-2 text-[var(--text-primary)]">
                    {r.pathogen_code || '—'}
                  </td>
                  <td className="px-4 py-2 text-[var(--text-secondary)]">
                    {r.specimen_type || '—'}
                  </td>
                  <td className="px-4 py-2 text-[var(--text-secondary)]">
                    {r.sub_county || '—'}
                  </td>
                  <td className="px-4 py-2">
                    {r.mdr_flag ? (
                      <span className="px-1.5 py-0.5 rounded-full bg-[var(--status-critical-bg)] text-[var(--status-critical)] text-[10px]">
                        MDR
                      </span>
                    ) : (
                      <span className="text-[var(--text-muted)]">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2 tabular-nums text-[var(--text-primary)]">
                    {formatPercent(r.mdr_probability * 100)}
                  </td>
                  <td className="px-4 py-2 text-[var(--text-muted)]">
                    {r.sample_collection_date || r.timestamp
                      ? new Date(r.sample_collection_date || r.timestamp).toLocaleDateString()
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function HistoryCaseGroupView({ records }) {
  const groups = useMemo(() => {
    const map = new Map();
    for (const r of records) {
      const key = r.case_id ?? '__ungrouped__';
      if (!map.has(key)) {
        map.set(key, { caseId: r.case_id, caseCode: r.case_code, rows: [] });
      }
      map.get(key).rows.push(r);
    }
    return [...map.values()].sort((a, b) => {
      if (a.caseId == null && b.caseId != null) return 1;
      if (a.caseId != null && b.caseId == null) return -1;
      return b.rows.length - a.rows.length;
    });
  }, [records]);

  if (groups.length === 0) {
    return <EmptyState title="No isolates" description="Adjust your filters." />;
  }

  return (
    <div>
      {groups.map((g) => (
        <CaseGroup
          key={g.caseId ?? 'ungrouped'}
          caseId={g.caseId}
          caseCode={g.caseCode}
          rows={g.rows}
        />
      ))}
    </div>
  );
}
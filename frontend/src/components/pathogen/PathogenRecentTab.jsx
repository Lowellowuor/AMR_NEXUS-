import { Link } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { formatPercent, formatDateTime, timeAgo } from '../../lib/format';

export default function PathogenRecentTab({ data }) {
  const rows = data.recent || [];

  if (rows.length === 0) {
    return (
      <div className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-8 text-center">
        <p className="text-sm text-[var(--text-muted)]">No recent isolates.</p>
      </div>
    );
  }

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--border-primary)]">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Latest 20 isolates for {data.code}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[var(--bg-tertiary)] border-b border-[var(--border-primary)]">
            <tr>
              <th className="text-left px-4 py-2 font-semibold text-[var(--text-secondary)]">When</th>
              <th className="text-left px-4 py-2 font-semibold text-[var(--text-secondary)]">County</th>
              <th className="text-left px-4 py-2 font-semibold text-[var(--text-secondary)]">Specimen</th>
              <th className="text-left px-4 py-2 font-semibold text-[var(--text-secondary)]">Sector</th>
              <th className="text-left px-4 py-2 font-semibold text-[var(--text-secondary)]">Antibiotic</th>
              <th className="text-left px-4 py-2 font-semibold text-[var(--text-secondary)]">MDR</th>
              <th className="text-right px-4 py-2 font-semibold text-[var(--text-secondary)]">Probability</th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-primary)]">
            {rows.map((r) => (
              <tr key={r.record_id} className="hover:bg-[var(--bg-tertiary)]/40 transition">
                <td className="px-4 py-2 text-xs text-[var(--text-muted)]" title={formatDateTime(r.timestamp)}>{timeAgo(r.timestamp)}</td>
                <td className="px-4 py-2 text-[var(--text-secondary)]">{r.county || '—'}</td>
                <td className="px-4 py-2 text-[var(--text-secondary)] capitalize">{r.specimen_type || '—'}</td>
                <td className="px-4 py-2 text-[var(--text-secondary)] capitalize">{r.sector || '—'}</td>
                <td className="px-4 py-2 text-[var(--text-secondary)]">{r.antibiotic_class || '—'}</td>
                <td className="px-4 py-2">
                  {r.mdr_flag ? (
                    <span className="inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--status-critical-bg)] text-[var(--status-critical)] border border-[var(--status-critical-border)]">
                      MDR
                    </span>
                  ) : (
                    <span className="inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--status-success-bg)] text-[var(--status-success)] border border-[var(--status-success-border)]">
                      S
                    </span>
                  )}
                </td>
                <td className="px-4 py-2 text-right tabular-nums text-[var(--text-primary)]">{formatPercent(r.mdr_probability * 100)}</td>
                <td className="px-4 py-2 text-right">
                  <Link
                    to={`/history?record=${r.record_id}`}
                    className="inline-flex p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--accent-teal)] hover:bg-[var(--bg-tertiary)] transition"
                    title="Open in History"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

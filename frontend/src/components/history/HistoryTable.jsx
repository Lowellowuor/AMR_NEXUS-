import { ArrowUp, ArrowDown, Copy, ExternalLink } from 'lucide-react';
import { formatPercent, formatDateTime, timeAgo } from '../../lib/format';
import { SORTABLE } from '../../lib/historyConfig';

function SortableHeader({ label, column, current, dir, onClick }) {
  const isActive = current === column;
  return (
    <th
      onClick={() => onClick(column)}
      className="px-3 py-3 text-left font-semibold text-[var(--text-secondary)] cursor-pointer select-none hover:text-[var(--text-primary)] group"
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {isActive ? (
          dir === 'desc' ? (
            <ArrowDown className="w-3 h-3 text-[var(--accent-teal)]" />
          ) : (
            <ArrowUp className="w-3 h-3 text-[var(--accent-teal)]" />
          )
        ) : (
          <ArrowDown className="w-3 h-3 opacity-0 group-hover:opacity-40 transition" />
        )}
      </span>
    </th>
  );
}

export default function HistoryTable({
  records,
  columns,
  sortBy,
  sortDir,
  onSort,
  selectedIds,
  onToggleSelected,
  onToggleAll,
  density,
  onView,
  onCopyId,
}) {
  const rowPadding = density === 'compact' ? 'py-1.5' : 'py-3';
  const allSelected = selectedIds.length === records.length && records.length > 0;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-[var(--bg-tertiary)] border-b border-[var(--border-primary)] sticky top-0 z-10">
          <tr>
            <th className={`px-3 ${rowPadding} w-8`}>
              <input
                type="checkbox"
                checked={allSelected}
                onChange={onToggleAll}
                className="rounded border-[var(--border-secondary)]"
              />
            </th>
            {columns.pathogen_code && (
              <SortableHeader label="Pathogen" column={SORTABLE.pathogen_code} current={sortBy} dir={sortDir} onClick={onSort} />
            )}
            {columns.county && (
              <SortableHeader label="County" column={SORTABLE.county} current={sortBy} dir={sortDir} onClick={onSort} />
            )}
            {columns.mdr_flag && (
              <SortableHeader label="MDR" column={SORTABLE.mdr_flag} current={sortBy} dir={sortDir} onClick={onSort} />
            )}
            {columns.mdr_probability && (
              <SortableHeader label="Probability" column={SORTABLE.mdr_probability} current={sortBy} dir={sortDir} onClick={onSort} />
            )}
            {columns.anomaly_flag && (
              <SortableHeader label="Anomaly" column={SORTABLE.anomaly_flag} current={sortBy} dir={sortDir} onClick={onSort} />
            )}
            {columns.created_at && (
              <SortableHeader label="Date" column={SORTABLE.created_at} current={sortBy} dir={sortDir} onClick={onSort} />
            )}
            <th className={`px-3 ${rowPadding} w-24`}></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border-primary)]">
          {records.map((r) => (
            <tr key={r.record_id} className="group hover:bg-[var(--bg-tertiary)]/40 transition">
              <td className={`px-3 ${rowPadding}`}>
                <input
                  type="checkbox"
                  checked={selectedIds.includes(r.record_id)}
                  onChange={() => onToggleSelected(r.record_id)}
                  className="rounded border-[var(--border-secondary)]"
                />
              </td>
              {columns.pathogen_code && (
                <td className={`px-3 ${rowPadding} font-medium text-[var(--text-primary)]`}>
                  {r.pathogen_code || '—'}
                </td>
              )}
              {columns.county && (
                <td className={`px-3 ${rowPadding} text-[var(--text-secondary)]`}>
                  {r.county || '—'}
                </td>
              )}
              {columns.mdr_flag && (
                <td className={`px-3 ${rowPadding}`}>
                  {r.mdr_flag ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[var(--status-critical-bg)] text-[var(--status-critical)] border border-[var(--status-critical-border)]">
                      MDR
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[var(--status-success-bg)] text-[var(--status-success)] border border-[var(--status-success-border)]">
                      Susceptible
                    </span>
                  )}
                </td>
              )}
              {columns.mdr_probability && (
                <td className={`px-3 ${rowPadding} tabular-nums text-[var(--text-primary)]`}>
                  {formatPercent((r.mdr_probability ?? 0) * 100)}
                </td>
              )}
              {columns.anomaly_flag && (
                <td className={`px-3 ${rowPadding}`}>
                  {r.anomaly_detected ? (
                    <span className="text-[var(--status-warning)] font-semibold text-xs">Flagged</span>
                  ) : (
                    <span className="text-[var(--text-muted)] text-xs">—</span>
                  )}
                </td>
              )}
              {columns.created_at && (
                <td className={`px-3 ${rowPadding} text-[var(--text-muted)] text-xs`} title={formatDateTime(r.timestamp)}>
                  {timeAgo(r.timestamp)}
                </td>
              )}
              <td className={`px-3 ${rowPadding} text-right`}>
                <div className="flex items-center justify-end gap-1">
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onCopyId(r.record_id)}
                      className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]"
                      title="Copy record ID"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <a
                      href={`/history?record=${r.record_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]"
                      title="Open in new tab"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                  <button
                    onClick={() => onView(r.record_id)}
                    className="text-sm text-[var(--accent-teal)] hover:underline ml-2"
                  >
                    View
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

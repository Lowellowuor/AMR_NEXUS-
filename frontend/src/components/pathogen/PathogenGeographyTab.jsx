import { MapPin } from 'lucide-react';
import { formatNumber, formatPercent } from '../../lib/format';
import { toneForRate } from '../../lib/pathogenConfig';
import PathogenGeographyMap from './PathogenGeographyMap';

const TONE = {
  success: 'bg-[var(--status-success-bg)] text-[var(--status-success)] border-[var(--status-success-border)]',
  warning: 'bg-[var(--status-warning-bg)] text-[var(--status-warning)] border-[var(--status-warning-border)]',
  critical: 'bg-[var(--status-critical-bg)] text-[var(--status-critical)] border-[var(--status-critical-border)]',
};

export default function PathogenGeographyTab({ data, onCountyClick }) {
  const rows = data.by_county || [];
  const nationalRate = data.summary?.mdr_rate ?? null;

  if (rows.length === 0) {
    return (
      <div className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-8 text-center">
        <MapPin className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2" />
        <p className="text-sm text-[var(--text-muted)]">No county-level data for this pathogen.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PathogenGeographyMap data={rows} onCountyClick={onCountyClick} />

      <div className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--border-primary)] flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[var(--accent-teal)]" />
            County distribution
          </h3>
          <span className="text-xs text-[var(--text-muted)]">
            Sorted by MDR rate · click a row or marker for details
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg-tertiary)] border-b border-[var(--border-primary)]">
              <tr>
                <th className="text-left px-4 py-2 font-semibold text-[var(--text-secondary)]">#</th>
                <th className="text-left px-4 py-2 font-semibold text-[var(--text-secondary)]">County</th>
                <th className="text-right px-4 py-2 font-semibold text-[var(--text-secondary)]">Samples</th>
                <th className="text-right px-4 py-2 font-semibold text-[var(--text-secondary)]">MDR count</th>
                <th className="text-right px-4 py-2 font-semibold text-[var(--text-secondary)]">MDR rate</th>
                <th className="text-right px-4 py-2 font-semibold text-[var(--text-secondary)]">vs national</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-primary)]">
              {rows.map((row, idx) => {
                const tone = toneForRate(row.mdr_rate);
                return (
                  <tr
                    key={row.county}
                    onClick={() => onCountyClick?.(row)}
                    className="hover:bg-[var(--bg-tertiary)]/40 cursor-pointer transition"
                  >
                    <td className="px-4 py-2 text-[var(--text-muted)] tabular-nums">{idx + 1}</td>
                    <td className="px-4 py-2 text-[var(--text-primary)] font-medium">{row.county}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-[var(--text-secondary)]">
                      {formatNumber(row.samples)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-[var(--text-secondary)]">
                      {formatNumber(row.mdr_count)}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <span className={`inline-block text-xs font-bold tabular-nums px-2 py-0.5 rounded-full border ${TONE[tone]}`}>
                        {formatPercent(row.mdr_rate)}
                      </span>
                    </td>
                    <td className={`px-4 py-2 text-right tabular-nums font-semibold ${
                      row.mdr_rate == null || nationalRate == null ? 'text-[var(--text-muted)]'
                      : row.mdr_rate - nationalRate > 5 ? 'text-[var(--status-critical)]'
                      : row.mdr_rate - nationalRate < -5 ? 'text-[var(--status-success)]'
                      : 'text-[var(--text-muted)]'
                    }`}>
                      {row.mdr_rate == null || nationalRate == null
                        ? '-'
                        : ((row.mdr_rate - nationalRate) > 0 ? '+' : '') + (row.mdr_rate - nationalRate).toFixed(1) + ' pts'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

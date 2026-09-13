import { useState } from 'react';
import { formatNumber, formatPercent } from '../../lib/format';

export default function CompareDeltaTable({ title, rows, keyLabel = 'Key', max = 12 }) {
  const [expanded, setExpanded] = useState(false);
  if (!rows || rows.length === 0) {
    return (
      <div className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-5">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">{title}</h3>
        <p className="text-xs text-[var(--text-muted)]">No data in either period.</p>
      </div>
    );
  }

  const visible = expanded ? rows : rows.slice(0, max);

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] overflow-hidden">
      <div className="px-5 py-3 border-b border-[var(--border-primary)] flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
        {rows.length > max && (
          <button onClick={() => setExpanded((v) => !v)} className="text-xs text-[var(--accent-teal)] hover:underline">
            {expanded ? 'Show less' : `Show all ${rows.length}`}
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[var(--bg-tertiary)] border-b border-[var(--border-primary)]">
            <tr>
              <th className="text-left px-4 py-2 font-semibold text-[var(--text-secondary)]">{keyLabel}</th>
              <th className="text-right px-4 py-2 font-semibold text-[var(--text-secondary)]">A samples</th>
              <th className="text-right px-4 py-2 font-semibold text-[var(--text-secondary)]">B samples</th>
              <th className="text-right px-4 py-2 font-semibold text-[var(--text-secondary)]">A rate</th>
              <th className="text-right px-4 py-2 font-semibold text-[var(--text-secondary)]">B rate</th>
              <th className="text-right px-4 py-2 font-semibold text-[var(--text-secondary)]">Delta</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-primary)]">
            {visible.map((r) => (
              <tr key={r.key} className="hover:bg-[var(--bg-tertiary)]/40">
                <td className="px-4 py-2 text-[var(--text-primary)] font-medium">{r.key}</td>
                <td className="px-4 py-2 text-right tabular-nums text-[var(--text-secondary)]">{formatNumber(r.a_samples)}</td>
                <td className="px-4 py-2 text-right tabular-nums text-[var(--text-secondary)]">{formatNumber(r.b_samples)}</td>
                <td className="px-4 py-2 text-right tabular-nums text-[var(--text-secondary)]">{formatPercent(r.a_rate)}</td>
                <td className="px-4 py-2 text-right tabular-nums text-[var(--text-secondary)]">{formatPercent(r.b_rate)}</td>
                <td className={`px-4 py-2 text-right tabular-nums font-semibold ${
                  r.delta > 0 ? 'text-[var(--status-critical)]'
                    : r.delta < 0 ? 'text-[var(--status-success)]'
                    : 'text-[var(--text-muted)]'
                }`}>
                  {r.delta > 0 ? '+' : ''}{r.delta} pts
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

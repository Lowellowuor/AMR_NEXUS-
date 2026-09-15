import { Fragment, useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { formatNumber, formatPercent } from '../../lib/format';
import { classifyAntibiotic, toneForRate } from '../../lib/pathogenConfig';

const TONE = {
  success: 'bg-[var(--status-success-bg)] text-[var(--status-success)] border-[var(--status-success-border)]',
  warning: 'bg-[var(--status-warning-bg)] text-[var(--status-warning)] border-[var(--status-warning-border)]',
  critical: 'bg-[var(--status-critical-bg)] text-[var(--status-critical)] border-[var(--status-critical-border)]',
};

export default function PathogenResistanceTab({ data }) {
  const [expanded, setExpanded] = useState({});
  const rows = data.by_class || [];
  const byAntibiotic = data.by_antibiotic || [];

  const toggle = (cls) => setExpanded((p) => ({ ...p, [cls]: !p[cls] }));
  const detailFor = (cls) => byAntibiotic.filter((x) => x.antibiotic_class === cls);

  if (rows.length === 0) {
    return (
      <div className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-8 text-center">
        <p className="text-sm text-[var(--text-muted)]">No antibiotic class data for this pathogen.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg-tertiary)] border-b border-[var(--border-primary)]">
              <tr>
                <th className="w-8"></th>
                <th className="text-left px-4 py-3 font-semibold text-[var(--text-secondary)]">Antibiotic class</th>
                <th className="text-left px-4 py-3 font-semibold text-[var(--text-secondary)]">AWaRe</th>
                <th className="text-right px-4 py-3 font-semibold text-[var(--text-secondary)]">Samples</th>
                <th className="text-right px-4 py-3 font-semibold text-[var(--text-secondary)]">MDR count</th>
                <th className="text-right px-4 py-3 font-semibold text-[var(--text-secondary)]">MDR rate</th>
                <th className="text-right px-4 py-3 font-semibold text-[var(--text-secondary)]">95% CI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-primary)]">
              {rows.map((row, idx) => {
                const aware = classifyAntibiotic(row.antibiotic_class);
                const tone = toneForRate(row.resistance);
                const isOpen = !!expanded[row.antibiotic_class];
                const details = detailFor(row.antibiotic_class);
                const hasDetail = details.length > 0;

                return (
                  <Fragment key={row.antibiotic_class}>
                    <tr
                      onClick={() => hasDetail && toggle(row.antibiotic_class)}
                      className={`hover:bg-[var(--bg-tertiary)]/40 ${hasDetail ? 'cursor-pointer' : ''}`}
                    >
                      <td className="pl-4 py-3">
                        {hasDetail && (
                          isOpen
                            ? <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
                            : <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
                        )}
                      </td>
                      <td className="px-4 py-3 text-[var(--text-primary)] font-medium">
                        {row.antibiotic_class}
                      </td>
                      <td className="px-4 py-3">
                        {aware ? (
                          <span className={`inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${TONE[aware.tone]}`}>
                            {aware.label}
                          </span>
                        ) : (
                          <span className="text-[var(--text-muted)] text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-[var(--text-secondary)]">
                        {formatNumber(row.samples)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-[var(--text-secondary)]">
                        {formatNumber(row.mdr_count)}
                      </td>
                      <td className={`px-4 py-3 text-right tabular-nums font-bold text-[var(--status-${tone})]`}>
                        {formatPercent(row.resistance)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-xs text-[var(--text-muted)]">
                        {row.ci_low}–{row.ci_high}%
                      </td>
                    </tr>

                    {isOpen && (
                      <tr key={`${row.antibiotic_class}-detail`} className="bg-[var(--bg-tertiary)]/30">
                        <td colSpan={7} className="px-4 py-3">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                            Break-down by SIR result and test method
                          </p>
                          <div className="space-y-1.5">
                            {details.map((d, i) => (
                              <div
                                key={`${d.sir_result}-${d.test_method}-${i}`}
                                className="flex items-center justify-between text-xs py-1 px-2 rounded hover:bg-[var(--bg-tertiary)]"
                              >
                                <span className="text-[var(--text-secondary)]">
                                  <span className="font-mono font-semibold text-[var(--text-primary)]">
                                    {d.sir_result}
                                  </span>
                                  {' · '}
                                  {d.test_method}
                                </span>
                                <span className="tabular-nums text-[var(--text-muted)]">
                                  {formatNumber(d.samples)} samples · {formatPercent(d.mdr_rate)} MDR
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {(data.by_specimen?.length || 0) > 0 && (
        <div className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-5">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">By specimen type</h3>
          <div className="space-y-2">
            {data.by_specimen.map((row) => (
              <div key={row.specimen_type} className="flex items-center gap-3">
                <span className="text-sm text-[var(--text-secondary)] w-32 truncate capitalize">
                  {row.specimen_type}
                </span>
                <div className="flex-1 h-2 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[var(--accent-teal)] transition-all"
                    style={{ width: `${Math.min(row.mdr_rate, 100)}%` }}
                  />
                </div>
                <span className="text-xs tabular-nums text-[var(--text-primary)] w-14 text-right">
                  {formatPercent(row.mdr_rate)}
                </span>
                <span className="text-xs tabular-nums text-[var(--text-muted)] w-14 text-right">
                  n={row.samples}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

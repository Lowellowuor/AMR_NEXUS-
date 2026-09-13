import { X, Check, Minus } from 'lucide-react';
import { formatPercent, formatDateTime, formatNumber } from '../../lib/format';

const ROWS = [
  { key: 'pathogen_code', label: 'Pathogen' },
  { key: 'county', label: 'County' },
  { key: 'sub_county', label: 'Sub-county' },
  { key: 'sector', label: 'Sector' },
  { key: 'antibiotic_class', label: 'Antibiotic class' },
  { key: 'test_method', label: 'Test method' },
  { key: 'specimen_type', label: 'Specimen' },
  { key: 'sir_result', label: 'SIR result' },
];

export default function HistoryComparisonModal({ records, open, onClose }) {
  if (!open || !records || records.length < 2) return null;

  const cols = records.length;

  const renderMdr = (r) =>
    r.mdr_flag ? (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--status-critical)]">
        <Check className="w-3.5 h-3.5" /> MDR
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--status-success)]">
        <Minus className="w-3.5 h-3.5" /> Susceptible
      </span>
    );

  const renderAnomaly = (r) =>
    r.anomaly_detected ? (
      <span className="text-xs font-semibold text-[var(--status-warning)]">Flagged</span>
    ) : (
      <span className="text-xs text-[var(--text-muted)]">Normal</span>
    );

  return (
    <div className="fixed inset-0 z-[1050] flex items-center justify-center p-3 sm:p-6">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-5xl max-h-[90vh] rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] shadow-2xl overflow-hidden flex flex-col">
        <header className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-primary)]">
          <div>
            <h2 className="text-base font-bold text-[var(--text-primary)]">
              Compare {cols} records
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Side-by-side clinical and prediction data
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="flex-1 overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 bg-[var(--bg-tertiary)] z-10">
              <tr>
                <th className="w-40 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] border-b border-[var(--border-primary)]">
                  Field
                </th>
                {records.map((r, i) => (
                  <th
                    key={r.record_id}
                    className="px-4 py-3 text-left text-xs font-semibold text-[var(--text-primary)] border-b border-l border-[var(--border-primary)]"
                  >
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--accent-teal)] text-white text-[10px] font-bold">
                        {i + 1}
                      </span>
                      <span className="truncate">{r.pathogen_code || 'Unnamed'}</span>
                    </div>
                    <p className="text-[10px] font-normal text-[var(--text-muted)] font-mono truncate">
                      {r.record_id?.slice(0, 12)}…
                    </p>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-primary)]">
              {/* Risk scores */}
              <tr className="bg-[var(--bg-primary)]/40">
                <td className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  MDR probability
                </td>
                {records.map((r) => (
                  <td key={r.record_id} className="px-4 py-3 border-l border-[var(--border-primary)]">
                    <span
                      className={`text-lg font-bold tabular-nums ${
                        (r.mdr_probability ?? 0) >= 0.6
                          ? 'text-[var(--status-critical)]'
                          : (r.mdr_probability ?? 0) >= 0.3
                            ? 'text-[var(--status-warning)]'
                            : 'text-[var(--status-success)]'
                      }`}
                    >
                      {formatPercent((r.mdr_probability ?? 0) * 100)}
                    </span>
                  </td>
                ))}
              </tr>

              <tr>
                <td className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  MDR status
                </td>
                {records.map((r) => (
                  <td key={r.record_id} className="px-4 py-3 border-l border-[var(--border-primary)]">
                    {renderMdr(r)}
                  </td>
                ))}
              </tr>

              <tr className="bg-[var(--bg-primary)]/40">
                <td className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Anomaly
                </td>
                {records.map((r) => (
                  <td key={r.record_id} className="px-4 py-3 border-l border-[var(--border-primary)]">
                    {renderAnomaly(r)}
                  </td>
                ))}
              </tr>

              <tr>
                <td className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Anomaly score
                </td>
                {records.map((r) => (
                  <td
                    key={r.record_id}
                    className="px-4 py-3 border-l border-[var(--border-primary)] tabular-nums text-[var(--text-primary)]"
                  >
                    {formatNumber(r.anomaly_score, 3)}
                  </td>
                ))}
              </tr>

              {/* Categorical fields */}
              {ROWS.map(({ key, label }, idx) => (
                <tr key={key} className={idx % 2 === 0 ? 'bg-[var(--bg-primary)]/40' : ''}>
                  <td className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    {label}
                  </td>
                  {records.map((r) => (
                    <td
                      key={r.record_id}
                      className="px-4 py-3 border-l border-[var(--border-primary)] text-[var(--text-primary)]"
                    >
                      {r[key] || '—'}
                    </td>
                  ))}
                </tr>
              ))}

              <tr>
                <td className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Sample date
                </td>
                {records.map((r) => (
                  <td
                    key={r.record_id}
                    className="px-4 py-3 border-l border-[var(--border-primary)] text-[var(--text-primary)]"
                  >
                    {r.sample_collection_date || '—'}
                  </td>
                ))}
              </tr>

              <tr className="bg-[var(--bg-primary)]/40">
                <td className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Recorded
                </td>
                {records.map((r) => (
                  <td
                    key={r.record_id}
                    className="px-4 py-3 border-l border-[var(--border-primary)] text-xs text-[var(--text-muted)]"
                  >
                    {formatDateTime(r.timestamp)}
                  </td>
                ))}
              </tr>

              {/* SHAP summary */}
              <tr>
                <td className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  SHAP summary
                </td>
                {records.map((r) => (
                  <td
                    key={r.record_id}
                    className="px-4 py-3 border-l border-[var(--border-primary)] text-xs text-[var(--text-secondary)] leading-relaxed max-w-xs"
                  >
                    {r.shap_summary || '—'}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        <footer className="flex justify-end gap-2 px-5 py-4 border-t border-[var(--border-primary)]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-[var(--radius-btn)] border border-[var(--border-primary)] text-[var(--text-secondary)] text-sm font-medium hover:bg-[var(--bg-tertiary)] transition"
          >
            Close
          </button>
        </footer>
      </div>
    </div>
  );
}

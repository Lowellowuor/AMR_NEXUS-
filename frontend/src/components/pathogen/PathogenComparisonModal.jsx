import { X } from 'lucide-react';
import { formatNumber, formatPercent } from '../../lib/format';

function Side({ data, label }) {
  if (!data) return null;
  const s = data.summary;
  return (
    <div className="flex-1 min-w-0">
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">{label}</p>
      <h3 className="text-lg font-bold text-[var(--text-primary)] truncate">{data.code}</h3>
      <div className="mt-3 space-y-1">
        <p className="text-2xl font-bold tabular-nums text-[var(--text-primary)]">{formatNumber(s.samples)}</p>
        <p className="text-xs text-[var(--text-muted)]">samples</p>
        <p className="text-xl font-bold tabular-nums text-[var(--status-critical)] mt-2">{formatPercent(s.mdr_rate)}</p>
        <p className="text-xs text-[var(--text-muted)]">MDR rate - 95% CI {s.ci_low}-{s.ci_high}%</p>
      </div>
    </div>
  );
}

export default function PathogenComparisonModal({ open, onClose, data, loading }) {
  if (!open) return null;

  const allClasses = new Set();
  if (data?.a?.by_class) data.a.by_class.forEach((c) => allClasses.add(c.antibiotic_class));
  if (data?.b?.by_class) data.b.by_class.forEach((c) => allClasses.add(c.antibiotic_class));
  const classes = Array.from(allClasses).sort();

  const rateA = data?.a?.summary?.mdr_rate ?? 0;
  const rateB = data?.b?.summary?.mdr_rate ?? 0;
  const aWorse = rateA > rateB;
  const bWorse = rateB > rateA;

  return (
    <div className="fixed inset-0 z-[1050] flex items-center justify-center p-3 sm:p-6">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-4xl max-h-[90vh] rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] shadow-2xl overflow-hidden flex flex-col">
        <header className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-primary)]">
          <div>
            <h2 className="text-base font-bold text-[var(--text-primary)]">Pathogen comparison</h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">Side-by-side resistance profile</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {loading ? (
            <div className="h-40 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent-teal)]" />
            </div>
          ) : data ? (
            <>
              <div className="flex gap-5">
                <Side data={data.a} label="Pathogen A" />
                <div className="w-px bg-[var(--border-primary)]" />
                <Side data={data.b} label="Pathogen B" />
              </div>

              <div className="rounded-lg border border-[var(--border-primary)] p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">
                  Antibiotic class comparison
                </p>
                <div className="space-y-3">
                  {classes.map((cls) => {
                    const ca = data.a.by_class?.find((x) => x.antibiotic_class === cls);
                    const cb = data.b.by_class?.find((x) => x.antibiotic_class === cls);
                    const aWins = (ca?.mdr_rate ?? 0) > (cb?.mdr_rate ?? 0);
                    const bWins = (cb?.mdr_rate ?? 0) > (ca?.mdr_rate ?? 0);
                    return (
                      <div key={cls} className="grid grid-cols-2 gap-3 items-center">
                        <div className="text-right">
                          <span className={`text-sm font-bold tabular-nums ${aWins ? 'text-[var(--status-critical)]' : 'text-[var(--text-secondary)]'}`}>
                            {ca ? `${ca.mdr_rate}%` : '-'}
                          </span>
                          <span className="text-[10px] text-[var(--text-muted)] ml-1 tabular-nums">
                            n={ca?.samples ?? 0}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="flex-1 h-1.5 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                            <div className={`h-full ${aWins ? 'bg-[var(--status-critical)]' : 'bg-[var(--accent-teal)]'}`} style={{ width: `${Math.min(ca?.mdr_rate ?? 0, 100)}%` }} />
                          </div>
                          <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider px-1">{cls}</span>
                          <div className="flex-1 h-1.5 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                            <div className={`h-full ${bWins ? 'bg-[var(--status-critical)]' : 'bg-[var(--accent-blue)]'}`} style={{ width: `${Math.min(cb?.mdr_rate ?? 0, 100)}%` }} />
                          </div>
                        </div>
                        <div className="text-right col-start-2">
                          <span className={`text-sm font-bold tabular-nums ${bWins ? 'text-[var(--status-critical)]' : 'text-[var(--text-secondary)]'}`}>
                            {cb ? `${cb.mdr_rate}%` : '-'}
                          </span>
                          <span className="text-[10px] text-[var(--text-muted)] ml-1 tabular-nums">
                            n={cb?.samples ?? 0}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-lg border border-[var(--border-primary)] p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">Summary</p>
                <p className="text-sm text-[var(--text-secondary)]">
                  {aWorse && `${data.a.code} has a ${(rateA - rateB).toFixed(1)} pt higher MDR rate than ${data.b.code}.`}
                  {bWorse && `${data.b.code} has a ${(rateB - rateA).toFixed(1)} pt higher MDR rate than ${data.a.code}.`}
                  {!aWorse && !bWorse && 'Both pathogens have the same MDR rate in this period.'}
                </p>
              </div>
            </>
          ) : (
            <p className="text-sm text-[var(--text-muted)] text-center py-6">No comparison data.</p>
          )}
        </div>
      </div>
    </div>
  );
}

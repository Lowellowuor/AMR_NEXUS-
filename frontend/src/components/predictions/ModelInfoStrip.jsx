import { useState } from 'react';
import { Info, ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react';

export default function ModelInfoStrip() {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)]">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-[var(--bg-tertiary)]/40 transition rounded-[var(--radius-card)]"
      >
        <div className="flex items-center gap-2 min-w-0">
          <ShieldCheck className="w-4 h-4 text-[var(--accent-teal)] flex-shrink-0" />
          <span className="text-sm font-medium text-[var(--text-primary)]">
            About this model
          </span>
          <span className="text-xs text-[var(--text-muted)] hidden sm:inline">
            v1.0.0 · XGBoost · decision support only
          </span>
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0" />
        )}
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-[var(--border-primary)]">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">
                What it does
              </p>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                Estimates the probability that an isolate is multi-drug resistant
                based on pathogen, sector, specimen, and exposure factors.
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">
                What it does not do
              </p>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                Not a diagnosis. Does not replace culture and susceptibility testing.
                Every output must be confirmed with laboratory results.
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">
                Performance
              </p>
              <dl className="text-sm text-[var(--text-secondary)] space-y-0.5">
                <div className="flex justify-between">
                  <dt>AUC‑ROC</dt>
                  <dd className="tabular-nums font-medium text-[var(--text-primary)]">0.86</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Sensitivity</dt>
                  <dd className="tabular-nums font-medium text-[var(--text-primary)]">0.79</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Specificity</dt>
                  <dd className="tabular-nums font-medium text-[var(--text-primary)]">0.81</dd>
                </div>
              </dl>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-[var(--border-primary)] flex items-start gap-2">
            <Info className="w-3.5 h-3.5 text-[var(--text-muted)] flex-shrink-0 mt-0.5" />
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Trained on Kenyan and East African surveillance data. Performance varies by county
              and pathogen. Full model card with fairness and calibration details is available
              in Settings.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

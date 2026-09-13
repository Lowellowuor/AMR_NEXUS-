import { ShieldCheck, BookOpen } from 'lucide-react';
import { classifyAntibiotic } from '../../lib/awareClassification';

export default function StewardshipTip({ result, antibioticClass }) {
  if (!result) return null;

  const aware = classifyAntibiotic(antibioticClass);

  const isMdr = result.mdr_flag;
  const prob = (result.mdr_probability ?? 0) * 100;

  let message;
  if (isMdr && prob >= 80) {
    message =
      'High confidence MDR. Consider Reserve agents only after culture confirmation. Review infection control measures.';
  } else if (isMdr) {
    message =
      'Likely MDR. Culture and susceptibility testing recommended before treatment change.';
  } else if (prob <= 20) {
    message =
      'Low MDR probability. First-line Access agents are reasonable while awaiting confirmatory testing.';
  } else {
    message =
      'Borderline prediction. Treat according to local antibiogram and clinical judgement.';
  }

  const toneClass = aware
    ? {
        success:
          'bg-[var(--status-success-bg)] border-[var(--status-success-border)] text-[var(--status-success)]',
        warning:
          'bg-[var(--status-warning-bg)] border-[var(--status-warning-border)] text-[var(--status-warning)]',
        critical:
          'bg-[var(--status-critical-bg)] border-[var(--status-critical-border)] text-[var(--status-critical)]',
      }[aware.tone]
    : 'bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--text-secondary)]';

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border-primary)]">
        <ShieldCheck className="w-4 h-4 text-[var(--accent-teal)]" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Antimicrobial stewardship
        </h3>
      </div>

      <div className="p-4 space-y-3">
        {aware && antibioticClass && (
          <div className={`rounded-lg border px-3 py-2 ${toneClass}`}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider">
                WHO AWaRe · {aware.label}
              </span>
            </div>
            <p className="text-xs leading-relaxed opacity-90">
              <strong>{antibioticClass}</strong> — {aware.description}
            </p>
          </div>
        )}

        <div className="flex items-start gap-2">
          <BookOpen className="w-3.5 h-3.5 text-[var(--text-muted)] flex-shrink-0 mt-0.5" />
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{message}</p>
        </div>
      </div>
    </div>
  );
}

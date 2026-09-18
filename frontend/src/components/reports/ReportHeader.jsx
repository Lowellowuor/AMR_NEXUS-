import { ShieldCheck } from 'lucide-react';

export default function ReportHeader({ meta }) {
  if (!meta) return null;

  return (
    <header className="border-b-2 border-[var(--text-primary)] pb-4 mb-6">
      <div className="flex items-start justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-lg bg-[var(--accent-teal)] flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-7 h-7 text-white" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Republic of Kenya  -  Ministry of Health
            </p>
            <h1 className="text-xl font-bold text-[var(--text-primary)] mt-0.5">
              {meta.title}
            </h1>
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">
              {meta.scope_label}
            </p>
          </div>
        </div>
        <div className="text-right text-xs text-[var(--text-muted)] leading-relaxed">
          <p className="font-mono">{meta.report_id}</p>
          <p>
            {meta.period.start} → {meta.period.end}
          </p>
          <p>Generated: {new Date(meta.generated_at).toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' })}</p>
          <p>By: {meta.generated_by}</p>
        </div>
      </div>
    </header>
  );
}

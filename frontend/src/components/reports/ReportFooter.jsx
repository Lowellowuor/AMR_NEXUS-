import { AlertTriangle } from 'lucide-react';

export default function ReportFooter({ meta }) {
  if (!meta) return null;

  return (
    <footer className="mt-8 pt-4 border-t border-[var(--border-primary)]">
      <div className="flex items-start gap-2 mb-3">
        <AlertTriangle className="w-3.5 h-3.5 text-[var(--status-warning)] flex-shrink-0 mt-0.5" />
        <p className="text-xs text-[var(--text-muted)] leading-relaxed">
          <strong className="text-[var(--text-secondary)]">Decision support only.</strong>{' '}
          {meta.disclaimer}
        </p>
      </div>
      <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)]">
        <span className="font-mono">{meta.report_id}</span>
        <span>AMR Nexus · v{meta.version} · Generated {new Date(meta.generated_at).toLocaleDateString('en-KE')}</span>
      </div>
    </footer>
  );
}

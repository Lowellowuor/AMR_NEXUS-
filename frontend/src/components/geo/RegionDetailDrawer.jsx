import { useEffect } from 'react';
import { X } from 'lucide-react';

export default function RegionDetailDrawer({ open, onClose, title, subtitle, children }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose && onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/30 z-40 lg:hidden"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        role="dialog"
        aria-label={title}
        className="fixed z-50 bg-[var(--bg-secondary)] border-[var(--border-primary)] shadow-xl inset-x-0 bottom-0 max-h-[70vh] rounded-t-[var(--radius-card)] border-t lg:inset-y-0 lg:right-0 lg:left-auto lg:bottom-auto lg:max-h-none lg:w-[420px] lg:rounded-none lg:border-l lg:border-t-0 flex flex-col"
      >
        <header className="flex items-start justify-between gap-3 px-4 py-3 border-b border-[var(--border-primary)]">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-[var(--text-primary)] truncate">{title}</h2>
            {subtitle && <p className="text-xs text-[var(--text-muted)] truncate">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1 rounded-md hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]"
          >
            <X className="w-4 h-4" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {children}
        </div>
      </aside>
    </>
  );
}

const TONE_CLASS = {
  critical: 'text-[var(--status-critical)]',
  warning: 'text-[var(--status-warning)]',
  success: 'text-[var(--status-success)]',
};

export function Metric({ label, value, hint, tone }) {
  if (value == null || value === '') return null;
  const toneCls = TONE_CLASS[tone] || 'text-[var(--text-primary)]';
  const cls = 'text-sm font-semibold tabular-nums ' + toneCls;
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-xs text-[var(--text-muted)]">{label}</span>
      <span className={cls}>
        {value}
        {hint && <span className="ml-1 text-xs font-normal text-[var(--text-muted)]">{hint}</span>}
      </span>
    </div>
  );
}

export function MetricGroup({ title, children }) {
  return (
    <section className="space-y-2">
      {title && <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">{title}</h3>}
      <div className="space-y-1.5">{children}</div>
    </section>
  );
}

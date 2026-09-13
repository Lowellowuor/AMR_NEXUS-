import clsx from 'clsx';

const variants = {
  neutral: 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border-[var(--border-primary)]',
  critical: 'bg-[var(--status-critical-bg)] text-[var(--status-critical)] border-[var(--status-critical-border)]',
  warning: 'bg-[var(--status-warning-bg)] text-[var(--status-warning)] border-[var(--status-warning-border)]',
  success: 'bg-[var(--status-success-bg)] text-[var(--status-success)] border-[var(--status-success-border)]',
  info: 'bg-[var(--status-info-bg)] text-[var(--status-info)] border-[var(--status-info-border)]',
};

export function Badge({ variant = 'neutral', className, children, ...rest }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-[var(--radius-pill)] border',
        variants[variant],
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}

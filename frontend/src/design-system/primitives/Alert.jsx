import clsx from 'clsx';
import {
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

const variants = {
  info: {
    wrapper: 'bg-[var(--status-info-bg)] border-[var(--status-info-border)] text-[var(--status-info)]',
    Icon: InformationCircleIcon,
  },
  success: {
    wrapper: 'bg-[var(--status-success-bg)] border-[var(--status-success-border)] text-[var(--status-success)]',
    Icon: CheckCircleIcon,
  },
  warning: {
    wrapper: 'bg-[var(--status-warning-bg)] border-[var(--status-warning-border)] text-[var(--status-warning)]',
    Icon: ExclamationTriangleIcon,
  },
  critical: {
    wrapper: 'bg-[var(--status-critical-bg)] border-[var(--status-critical-border)] text-[var(--status-critical)]',
    Icon: XCircleIcon,
  },
};

export function Alert({ variant = 'info', title, children, className }) {
  const config = variants[variant];
  const Icon = config.Icon;
  return (
    <div
      role="alert"
      className={clsx(
        'flex gap-3 rounded-[var(--radius-card)] border p-4 text-sm',
        config.wrapper,
        className,
      )}
    >
      <Icon className="h-5 w-5 flex-shrink-0" />
      <div className="flex-1">
        {title && <p className="font-semibold mb-0.5">{title}</p>}
        {children && <div className="text-[var(--text-secondary)]">{children}</div>}
      </div>
    </div>
  );
}

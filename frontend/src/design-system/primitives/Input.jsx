import { forwardRef } from 'react';
import clsx from 'clsx';

const base =
  'w-full rounded-[var(--radius-input)] border bg-[var(--bg-secondary)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-colors focus:outline-none focus:ring-2';

export const Input = forwardRef(function Input(
  { className, error, ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      className={clsx(
        base,
        error
          ? 'border-[var(--status-critical)] focus:border-[var(--status-critical)] focus:ring-[var(--status-critical)]/20'
          : 'border-[var(--border-primary)] focus:border-[var(--accent-teal)] focus:ring-[var(--accent-teal)]/20',
        className,
      )}
      {...rest}
    />
  );
});

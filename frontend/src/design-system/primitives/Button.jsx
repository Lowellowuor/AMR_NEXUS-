import { forwardRef } from 'react';
import clsx from 'clsx';

const base =
  'inline-flex items-center justify-center gap-2 font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

const variants = {
  primary:
    'bg-[var(--accent-teal)] text-white hover:bg-[var(--accent-cyan-hover)] focus-visible:ring-[var(--accent-teal)]',
  secondary:
    'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border-secondary)] hover:bg-[var(--bg-tertiary)] focus-visible:ring-[var(--border-strong)]',
  ghost:
    'bg-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] focus-visible:ring-[var(--border-strong)]',
  danger:
    'bg-[var(--status-critical)] text-white hover:opacity-90 focus-visible:ring-[var(--status-critical)]',
};

const sizes = {
  sm: 'text-xs px-3 py-1.5',
  md: 'text-sm px-4 py-2',
  lg: 'text-base px-6 py-2.5',
};

export const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', className, type = 'button', children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={clsx(base, variants[variant], sizes[size], 'rounded-[var(--radius-btn)]', className)}
      {...rest}
    >
      {children}
    </button>
  );
});

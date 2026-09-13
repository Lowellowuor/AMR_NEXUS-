import clsx from 'clsx';

export function Card({ className, children, ...rest }) {
  return (
    <div
      className={clsx(
        'bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-[var(--radius-card)] shadow-[var(--shadow-md)]',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

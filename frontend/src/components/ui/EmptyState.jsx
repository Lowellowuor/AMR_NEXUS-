export default function EmptyState({ icon: Icon, title, description, action, className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center text-center py-10 px-6 ${className}`}>
      {Icon && (
        <div className="w-12 h-12 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center mb-3">
          <Icon className="w-6 h-6 text-[var(--text-muted)]" />
        </div>
      )}
      <p className="text-sm font-semibold text-[var(--text-primary)]">{title}</p>
      {description && (
        <p className="text-xs text-[var(--text-muted)] mt-1 max-w-sm">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

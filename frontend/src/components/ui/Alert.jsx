export default function Alert({ children, type = 'info', className = '' }) {
  const styles = {
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    warning: 'bg-[var(--status-warning-bg)] border-yellow-200 text-yellow-800',
    error: 'bg-[var(--status-critical-bg)] border-[var(--status-critical-border)] text-red-800',
    success: 'bg-[var(--status-success-bg)] border-green-200 text-green-800',
  };
  return (
    <div className={`p-4 rounded-lg border ${styles[type]} ${className}`}>
      {children}
    </div>
  );
}
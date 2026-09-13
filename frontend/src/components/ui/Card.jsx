export default function Card({ children, className = '' }) {
  return (
    <div className={`bg-[var(--bg-secondary)] rounded-xl shadow-sm border border-[var(--border-primary)] p-6 ${className}`}>
      {children}
    </div>
  );
}
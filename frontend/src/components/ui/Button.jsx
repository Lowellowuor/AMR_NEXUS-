export default function Button({ children, onClick, type = 'button', loading = false, disabled = false, className = '' }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`px-4 py-2 bg-[var(--accent-teal)] text-white font-medium rounded-lg hover:bg-[var(--accent-teal)] focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {loading ? 'Loading...' : children}
    </button>
  );
}
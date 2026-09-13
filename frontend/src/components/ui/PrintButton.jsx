import { Printer } from 'lucide-react';

export default function PrintButton({ label = 'Print' }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-btn)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] text-sm font-medium hover:bg-[var(--bg-tertiary)] transition"
    >
      <Printer className="w-4 h-4" />
      {label}
    </button>
  );
}

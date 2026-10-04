const TONES = {
  unverified: {
    label: 'Unverified',
    cls: 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]',
  },
  verified: {
    label: 'Verified',
    cls: 'bg-[var(--status-success-bg)] text-[var(--status-success)]',
  },
  flagged: {
    label: 'Flagged',
    cls: 'bg-[var(--status-warning-bg)] text-[var(--status-warning)]',
  },
  rejected: {
    label: 'Rejected',
    cls: 'bg-[var(--status-critical-bg)] text-[var(--status-critical)]',
  },
};

export default function ValidationBadge({ state, size = 'md' }) {
  const tone = TONES[state] || TONES.unverified;
  const sizing =
    size === 'sm'
      ? 'text-[9px] px-1.5 py-0.5'
      : 'text-[10px] px-2 py-0.5';
  return (
    <span
      className={`inline-flex items-center font-semibold uppercase tracking-wider rounded-full ${tone.cls} ${sizing}`}
    >
      {tone.label}
    </span>
  );
}
const HOUR = 60 * 60 * 1000;

export function classifyAge(timestamp) {
  if (!timestamp) return { tier: 'unknown', hours: 0, label: '—', tone: 'muted' };
  const ageMs = Date.now() - new Date(timestamp).getTime();
  const hours = ageMs / HOUR;

  if (hours < 1) {
    const minutes = Math.max(1, Math.floor(ageMs / 60000));
    return { tier: 'fresh', hours, label: `${minutes}m`, tone: 'success' };
  }
  if (hours < 4) {
    return { tier: 'aging', hours, label: `${Math.floor(hours)}h`, tone: 'warning' };
  }
  if (hours < 24) {
    return { tier: 'overdue', hours, label: `${Math.floor(hours)}h`, tone: 'critical' };
  }
  const days = Math.floor(hours / 24);
  return { tier: 'stale', hours, label: `${days}d`, tone: 'critical' };
}

export function ageToneClass(tone) {
  return {
    success: 'bg-[var(--status-success-bg)] text-[var(--status-success)] border-[var(--status-success-border)]',
    warning: 'bg-[var(--status-warning-bg)] text-[var(--status-warning)] border-[var(--status-warning-border)]',
    critical: 'bg-[var(--status-critical-bg)] text-[var(--status-critical)] border-[var(--status-critical-border)]',
    muted: 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] border-[var(--border-primary)]',
  }[tone] || '';
}

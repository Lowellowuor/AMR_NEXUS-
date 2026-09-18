import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ShieldAlert, Bell, ChevronRight, Inbox } from 'lucide-react';
import { timeAgo } from '../../lib/format';

const SEVERITY = {
  critical: {
    icon: AlertTriangle,
    accent: 'text-[var(--status-critical)]',
    dot: 'bg-[var(--status-critical)]',
    label: 'Critical',
  },
  high: {
    icon: ShieldAlert,
    accent: 'text-[var(--status-warning)]',
    dot: 'bg-[var(--status-warning)]',
    label: 'High',
  },
  medium: {
    icon: Bell,
    accent: 'text-[var(--status-info)]',
    dot: 'bg-[var(--status-info)]',
    label: 'Medium',
  },
  low: {
    icon: Bell,
    accent: 'text-[var(--text-muted)]',
    dot: 'bg-[var(--text-muted)]',
    label: 'Low',
  },
};

const ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

export default function AlertFeedPanel({ alerts = [], onAlertClick, maxItems = 6 }) {
  const sorted = useMemo(() => {
    return [...alerts]
      .filter((a) => !a.resolved)
      .sort((x, y) => {
        const sx = ORDER[x.severity] ?? 99;
        const sy = ORDER[y.severity] ?? 99;
        if (sx !== sy) return sx - sy;
        return new Date(y.timestamp || 0) - new Date(x.timestamp || 0);
      })
      .slice(0, maxItems);
  }, [alerts, maxItems]);

  const counts = useMemo(() => {
    const active = alerts.filter((a) => !a.resolved);
    return {
      total: active.length,
      critical: active.filter((a) => a.severity === 'critical').length,
    };
  }, [alerts]);

  return (
    <section
      aria-label="Active alerts"
      className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] overflow-hidden"
    >
      <header className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-primary)]">
        <div className="flex items-center gap-2 min-w-0">
          <Bell className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] truncate">
            Active alerts
          </h3>
          {counts.total > 0 && (
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-[var(--bg-tertiary)] text-[10px] font-bold text-[var(--text-secondary)] tabular-nums">
              {counts.total}
            </span>
          )}
        </div>
        <Link
          to="/alerts"
          className="inline-flex items-center gap-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--accent-teal)] hover:opacity-80 transition flex-shrink-0"
        >
          Open
          <ChevronRight className="w-3 h-3" />
        </Link>
      </header>

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
          <div className="w-10 h-10 rounded-full bg-[var(--status-success-bg)] flex items-center justify-center mb-3">
            <Inbox className="w-4 h-4 text-[var(--status-success)]" />
          </div>
          <p className="text-sm font-medium text-[var(--text-primary)]">No active alerts</p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">System is stable</p>
        </div>
      ) : (
        <ul className="divide-y divide-[var(--border-primary)]">
          {sorted.map((alert) => {
            const cfg = SEVERITY[alert.severity] || SEVERITY.medium;
            const Icon = cfg.icon;
            return (
              <li key={alert.id}>
                <button
                  onClick={() => onAlertClick?.(alert)}
                  className="w-full text-left px-4 py-3 hover:bg-[var(--bg-tertiary)]/50 transition group flex items-start gap-3"
                >
                  <span
                    className={`mt-1.5 inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`}
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${cfg.accent}`}>
                        {cfg.label}
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)]"> - </span>
                      <span className="text-[10px] text-[var(--text-muted)] tabular-nums">
                        {timeAgo(alert.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--text-primary)] leading-snug line-clamp-2">
                      {alert.message || `${alert.pathogen_code || 'Unknown'} in ${alert.county || 'unknown'}`}
                    </p>
                    {(alert.county || alert.sector) && (
                      <p className="text-[10px] text-[var(--text-muted)] mt-1 truncate">
                        {alert.county}
                        {alert.sub_county ? `  -  ${alert.sub_county}` : ''}
                        {alert.sector ? `  -  ${alert.sector}` : ''}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition flex-shrink-0 mt-1" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {counts.critical > 0 && (
        <div className="px-4 py-2.5 border-t border-[var(--border-primary)] bg-[var(--status-critical-bg)]">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--status-critical)]">
            {counts.critical} critical requiring review
          </p>
        </div>
      )}
    </section>
  );
}

import {
  AlertTriangle, ShieldAlert, Bell, Clock, ChevronRight, Check, User,
} from 'lucide-react';
import { timeAgo, formatPercent } from '../../lib/format';
import { SEVERITY_META } from '../../lib/alertsConfig';
import { classifyAge, ageToneClass } from '../../lib/alertAge';

const SEVERITY_ICON = {
  critical: AlertTriangle,
  high: ShieldAlert,
  medium: Bell,
  low: Bell,
};

const SEVERITY_STYLE = {
  critical: {
    border: 'border-l-[var(--status-critical)]',
    bg: 'bg-[var(--status-critical-bg)]',
    iconColor: 'text-[var(--status-critical)]',
    badge: 'bg-[var(--status-critical-bg)] text-[var(--status-critical)] border-[var(--status-critical-border)]',
  },
  high: {
    border: 'border-l-[var(--status-warning)]',
    bg: 'bg-[var(--status-warning-bg)]',
    iconColor: 'text-[var(--status-warning)]',
    badge: 'bg-[var(--status-warning-bg)] text-[var(--status-warning)] border-[var(--status-warning-border)]',
  },
  medium: {
    border: 'border-l-[var(--status-info)]',
    bg: 'bg-[var(--status-info-bg)]',
    iconColor: 'text-[var(--status-info)]',
    badge: 'bg-[var(--status-info-bg)] text-[var(--status-info)] border-[var(--status-info-border)]',
  },
  low: {
    border: 'border-l-[var(--border-strong)]',
    bg: 'bg-[var(--bg-tertiary)]',
    iconColor: 'text-[var(--text-muted)]',
    badge: 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border-[var(--border-primary)]',
  },
};

export default function AlertsList({
  alerts,
  selectedIds,
  newIds,
  onToggleSelected,
  onToggleAll,
  density,
  onView,
}) {
  const padding = density === 'compact' ? 'py-2.5' : 'py-4';
  const allSelected = alerts.length > 0 && selectedIds.length === alerts.length;
  const newSet = newIds instanceof Set ? newIds : new Set();

  return (
    <div className="space-y-2">
      {alerts.length > 1 && (
        <label className="flex items-center gap-2 px-1 text-xs text-[var(--text-muted)] cursor-pointer">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={onToggleAll}
            className="rounded border-[var(--border-secondary)]"
          />
          Select all on this page
        </label>
      )}

      <ul className="space-y-2">
        {alerts.map((alert) => {
          const severity = alert.severity || 'medium';
          const style = SEVERITY_STYLE[severity] || SEVERITY_STYLE.medium;
          const Icon = SEVERITY_ICON[severity] || Bell;
          const selected = selectedIds.includes(alert.id);
          const isNew = newSet.has(alert.id);
          const age = classifyAge(alert.timestamp);
          const ageClass = ageToneClass(age.tone);

          return (
            <li
              key={alert.id}
              className={[
                'rounded-[var(--radius-card)] border border-[var(--border-primary)] border-l-4',
                style.border,
                'bg-[var(--bg-secondary)] overflow-hidden transition hover:shadow-[var(--shadow-md)]',
                isNew ? 'ring-2 ring-[var(--accent-teal)]/30' : '',
              ].join(' ')}
            >
              <div className={`flex items-start gap-3 px-4 ${padding}`}>
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => onToggleSelected(alert.id)}
                  className="mt-1 rounded border-[var(--border-secondary)] flex-shrink-0"
                />

                <div className={`relative w-9 h-9 rounded-lg ${style.bg} flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-4 h-4 ${style.iconColor}`} />
                  {isNew && (
                    <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[var(--accent-teal)] animate-pulse" />
                  )}
                </div>

                <button
                  onClick={() => onView(alert.id)}
                  className="flex-1 min-w-0 text-left"
                >
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <p className="text-sm font-semibold text-[var(--text-primary)] leading-snug">
                      {alert.message}
                    </p>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {isNew && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--accent-teal)] text-white">
                          New
                        </span>
                      )}
                      <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${style.badge}`}>
                        {SEVERITY_META[severity]?.label || severity}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--text-muted)]">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {timeAgo(alert.timestamp)}
                    </span>
                    {!alert.acknowledged && !alert.resolved && (
                      <span
                        className={`inline-flex items-center text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border ${ageClass}`}
                        title={`Alert age: ${age.hours.toFixed(1)} hours`}
                      >
                        {age.label}
                      </span>
                    )}
                    <span> - </span>
                    <span className="capitalize">{alert.sector || '-'}</span>
                    {alert.sub_county && (
                      <>
                        <span> - </span>
                        <span>{alert.sub_county}</span>
                      </>
                    )}
                    {alert.mdr_probability > 0 && (
                      <>
                        <span> - </span>
                        <span className="tabular-nums">MDR {formatPercent(alert.mdr_probability * 100)}</span>
                      </>
                    )}
                  </div>

                  {(alert.acknowledged || alert.resolved || alert.assigned_to) && (
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      {alert.acknowledged && !alert.resolved && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--status-info-bg)] text-[var(--status-info)] border border-[var(--status-info-border)]">
                          <Check className="w-3 h-3" />
                          Acknowledged
                        </span>
                      )}
                      {alert.resolved && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--status-success-bg)] text-[var(--status-success)] border border-[var(--status-success-border)]">
                          <Check className="w-3 h-3" />
                          Resolved
                        </span>
                      )}
                      {alert.assigned_to && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border border-[var(--border-primary)]">
                          <User className="w-3 h-3" />
                          {alert.assigned_to}
                        </span>
                      )}
                    </div>
                  )}
                </button>

                <button
                  onClick={() => onView(alert.id)}
                  className="p-2 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition flex-shrink-0"
                  aria-label="Open alert"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

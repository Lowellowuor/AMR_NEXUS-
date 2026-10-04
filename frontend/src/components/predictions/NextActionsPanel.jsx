import { Link } from 'react-router-dom';
import {
  ExclamationTriangleIcon,
  BeakerIcon,
  MapPinIcon,
  BellAlertIcon,
  ShieldCheckIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';

const PRIORITY_STYLES = {
  critical: {
    border: 'border-[var(--status-critical)]/40',
    bg: 'bg-[var(--status-critical-bg)]/25',
    text: 'text-[var(--status-critical)]',
    label: 'CRITICAL',
  },
  high: {
    border: 'border-[var(--status-warning)]/40',
    bg: 'bg-[var(--status-warning-bg)]/25',
    text: 'text-[var(--status-warning)]',
    label: 'HIGH',
  },
  routine: {
    border: 'border-[var(--border-primary)]/40',
    bg: 'bg-[var(--bg-tertiary)]/40',
    text: 'text-[var(--text-muted)]',
    label: 'ROUTINE',
  },
};

function iconFor(route) {
  if (route === 'lab') return BeakerIcon;
  if (route === 'investigation') return ExclamationTriangleIcon;
  if (route === 'hotspot') return MapPinIcon;
  if (route === 'alert') return BellAlertIcon;
  if (route === 'clinical_guidance') return ShieldCheckIcon;
  return ShieldCheckIcon;
}

function linkFor(route) {
  if (route === 'lab') return '/lab-queue';
  if (route === 'hotspot') return '/hotspots';
  if (route === 'alert') return '/alerts';
  if (route === 'clinical_guidance') return '/guidance';
  return null;
}

export default function NextActionsPanel({ actions }) {
  if (!actions || actions.length === 0) return null;

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border-primary)]">
        <ShieldCheckIcon className="w-4 h-4 text-[var(--accent-teal)]" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Next actions
        </h3>
        <span className="ml-auto text-xs text-[var(--text-muted)]">
          {actions.length} recommended
        </span>
      </div>

      <ul className="divide-y divide-[var(--border-primary)]/40">
        {actions.map((a) => {
          const Icon = iconFor(a.route);
          const tone = PRIORITY_STYLES[a.priority] || PRIORITY_STYLES.routine;
          const link = linkFor(a.route);
          return (
            <li key={a.id} className={`px-4 py-3 ${tone.bg}`}>
              <div className="flex items-start gap-3">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${tone.bg} border ${tone.border}`}
                >
                  <Icon className={`w-4 h-4 ${tone.text}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-[10px] font-bold tracking-wider ${tone.text}`}>
                      {tone.label}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    {a.title}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                    {a.detail}
                  </p>
                  {link && (
                    <Link
                      to={link}
                      className="inline-flex items-center gap-1 text-xs text-[var(--accent-teal)] hover:underline mt-2"
                    >
                      Open {a.route.replace('_', ' ')}
                      <ArrowRightIcon className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
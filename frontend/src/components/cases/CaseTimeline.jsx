import {
  FolderPlusIcon,
  LinkIcon,
  ArrowRightCircleIcon,
  ArrowsPointingInIcon,
  ArrowsPointingOutIcon,
  LockClosedIcon,
  LockOpenIcon,
  DocumentPlusIcon,
} from '@heroicons/react/24/outline';

const EVENT_ICON = {
  created: FolderPlusIcon,
  isolate_linked: LinkIcon,
  isolate_detached: ArrowRightCircleIcon,
  merged_in: ArrowsPointingInIcon,
  split_out: ArrowsPointingOutIcon,
  closed: LockClosedIcon,
  reopened: LockOpenIcon,
};

const EVENT_LABEL = {
  created: 'Case created',
  isolate_linked: 'Isolate linked',
  isolate_detached: 'Isolate detached',
  merged_in: 'Case merged in',
  split_out: 'Isolate split out',
  closed: 'Case closed',
  reopened: 'Case reopened',
};

function timeAgo(iso) {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  const secs = Math.floor((Date.now() - then) / 1000);
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return new Date(iso).toLocaleDateString();
}

export default function CaseTimeline({ events }) {
  if (!events || events.length === 0) {
    return (
      <div className="rounded-2xl border border-[var(--border-primary)]/40 bg-[var(--bg-secondary)]/80 p-5">
        <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
          Case timeline
        </h2>
        <p className="text-xs text-[var(--text-muted)] italic">No events yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[var(--border-primary)]/40 bg-[var(--bg-secondary)]/80 p-5">
      <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
        <DocumentPlusIcon className="w-4 h-4 text-[var(--text-muted)]" />
        Case timeline
        <span className="ml-auto text-[10px] text-[var(--text-muted)] font-normal">
          {events.length} event{events.length === 1 ? '' : 's'}
        </span>
      </h2>

      <ol className="relative border-l border-[var(--border-primary)]/60 ml-2 space-y-4">
        {events.map((e) => {
          const Icon = EVENT_ICON[e.event_type] || DocumentPlusIcon;
          const label = EVENT_LABEL[e.event_type] || e.event_type;
          return (
            <li key={e.id} className="pl-5">
              <span className="absolute -left-[9px] mt-0.5 w-4 h-4 rounded-full bg-[var(--bg-primary)] border border-[var(--border-primary)] flex items-center justify-center">
                <Icon className="w-2.5 h-2.5 text-[var(--accent-teal)]" />
              </span>
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-xs font-medium text-[var(--text-primary)]">
                  {label}
                </span>
                <span className="text-[10px] text-[var(--text-muted)]">
                  {timeAgo(e.created_at)}
                </span>
              </div>
              {e.note && (
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  {e.note}
                </p>
              )}
              {e.actor_name && (
                <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                  by {e.actor_name}
                </p>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
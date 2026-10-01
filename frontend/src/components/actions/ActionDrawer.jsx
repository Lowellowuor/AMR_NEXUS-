import { useMutation, useQueryClient } from '@tanstack/react-query';
import RegionDetailDrawer, { Metric, MetricGroup } from '../geo/RegionDetailDrawer';
import api from '../../api/client';
import { formatDateTime } from '../../lib/format';

const STATUS_LABEL = {
  open: 'Open',
  in_progress: 'In progress',
  done: 'Done',
  cancelled: 'Cancelled',
};

const PRIORITY_TONE = {
  critical: 'critical',
  high: 'warning',
  medium: null,
  low: 'success',
};

function formatDate(value) {
  if (!value) return null;
  try {
    return String(value).slice(0, 10);
  } catch {
    return value;
  }
}

export default function ActionDrawer({ action, onClose, canModify }) {
  const qc = useQueryClient();

  const statusMutation = useMutation({
    mutationFn: ({ id, status }) => api.updateAction(id, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['actions'] });
      qc.invalidateQueries({ queryKey: ['my-actions'] });
    },
  });

  const closeMutation = useMutation({
    mutationFn: ({ id, note }) =>
      api.closeAction(id, { status: 'done', closing_note: note }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['actions'] });
      qc.invalidateQueries({ queryKey: ['my-actions'] });
      onClose?.();
    },
  });

  if (!action) return null;

  const isClosed = action.status === 'done' || action.status === 'cancelled';

  return (
    <RegionDetailDrawer
      open={!!action}
      onClose={onClose}
      title={action.title}
      subtitle={[action.county, action.sub_county].filter(Boolean).join(' · ') || undefined}
    >
      <MetricGroup title="Status">
        <Metric label="State" value={STATUS_LABEL[action.status] || action.status} />
        <Metric
          label="Priority"
          value={action.priority}
          tone={PRIORITY_TONE[action.priority]}
        />
        <Metric
          label="Source"
          value={action.source_type}
          hint={action.source_id || undefined}
        />
        <Metric label="Due" value={formatDate(action.due_date)} />
        {action.closed_at && (
          <Metric label="Closed" value={formatDate(action.closed_at)} />
        )}
      </MetricGroup>

      {action.description && (
        <MetricGroup title="Description">
          <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">
            {action.description}
          </p>
        </MetricGroup>
      )}

      {action.closing_note && (
        <MetricGroup title="Closing note">
          <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">
            {action.closing_note}
          </p>
        </MetricGroup>
      )}

      <MetricGroup title="Timeline">
        <Metric label="Created" value={formatDateTime(action.created_at)} />
        <Metric label="Updated" value={formatDateTime(action.updated_at)} />
      </MetricGroup>

      {canModify && !isClosed && (
        <div className="mt-4 flex flex-wrap gap-2">
          {action.status === 'open' && (
            <button
              type="button"
              onClick={() =>
                statusMutation.mutate({ id: action.id, status: 'in_progress' })
              }
              className="text-xs px-3 py-1.5 rounded-full border border-[var(--border-primary)] hover:bg-[var(--bg-tertiary)]/60"
            >
              Start
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              const note = window.prompt('Closing note (optional):') || '';
              closeMutation.mutate({ id: action.id, note });
            }}
            className="text-xs px-3 py-1.5 rounded-full bg-[var(--accent-teal)] text-white"
          >
            Mark done
          </button>
          <button
            type="button"
            onClick={() =>
              statusMutation.mutate({ id: action.id, status: 'cancelled' })
            }
            className="text-xs px-3 py-1.5 rounded-full border border-[var(--border-primary)] text-[var(--status-warning)]"
          >
            Cancel
          </button>
        </div>
      )}
    </RegionDetailDrawer>
  );
}
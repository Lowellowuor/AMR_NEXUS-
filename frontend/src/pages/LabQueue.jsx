import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Beaker, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../api/client';
import { Skeleton } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import { usePageTitle } from '../hooks/usePageTitle';

const SLA_TONE = {
  on_track: 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]',
  at_risk: 'bg-[var(--status-warning-bg)] text-[var(--status-warning)]',
  breached: 'bg-[var(--status-critical-bg)] text-[var(--status-critical)]',
  met: 'bg-[var(--status-success-bg)] text-[var(--status-success)]',
  missed: 'bg-[var(--status-critical-bg)] text-[var(--status-critical)]',
  unknown: 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]',
};

function SlaBadge({ label, sla }) {
  if (!sla || !sla.state) return null;
  const tone = SLA_TONE[sla.state] || SLA_TONE.unknown;
  return (
    <span
      className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${tone}`}
      title={`${label}: ${sla.hours_elapsed}h of ${sla.hours_allowed}h`}
    >
      {label} {sla.state.replace('_', ' ')}
    </span>
  );
}

const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'rejected', label: 'Rejected' },
];

const PRIORITY_TONE = {
  routine: 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]',
  urgent: 'bg-[var(--status-warning-bg)] text-[var(--status-warning)]',
  stat: 'bg-[var(--status-critical-bg)] text-[var(--status-critical)]',
};

function CompleteForm({ req, onDone, onCancel }) {
  const qc = useQueryClient();
  const [result, setResult] = useState('');
  const [mdr, setMdr] = useState(null);

  const mutation = useMutation({
    mutationFn: (data) => api.updateLabRequest(req.id, data),
    onSuccess: () => {
      toast.success('Request completed');
      qc.invalidateQueries({ queryKey: ['lab-requests'] });
      qc.invalidateQueries({ queryKey: ['lab-pending', req.record_id] });
      onDone?.();
    },
    onError: () => toast.error('Failed to complete request'),
  });

  const submit = () => {
    if (mdr === null) {
      toast.error('Select the confirmed MDR status');
      return;
    }
    mutation.mutate({
      status: 'completed',
      result_notes: result.trim() || null,
      confirmed_mdr: mdr,
    });
  };

  return (
    <div className="space-y-3 p-4 bg-[var(--bg-primary)]/40 rounded-lg border border-[var(--border-primary)]/40">
      <p className="text-xs font-medium text-[var(--text-primary)]">
        Confirm lab result for {req.isolate?.pathogen_code || 'isolate'}
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => setMdr(true)}
          className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition ${
            mdr === true
              ? 'bg-[var(--status-critical)] text-white'
              : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-primary)]'
          }`}
        >
          MDR confirmed
        </button>
        <button
          onClick={() => setMdr(false)}
          className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition ${
            mdr === false
              ? 'bg-[var(--status-success)] text-white'
              : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-primary)]'
          }`}
        >
          Not MDR
        </button>
      </div>
      <textarea
        value={result}
        onChange={(e) => setResult(e.target.value)}
        placeholder="Result notes (optional)"
        rows={2}
        className="w-full px-2 py-1.5 text-xs rounded-lg bg-[var(--bg-primary)] border border-[var(--border-primary)]/40 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-teal)]"
      />
      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="px-3 py-1 rounded-lg text-xs text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)]"
        >
          Cancel
        </button>
        <button
          onClick={submit}
          disabled={mutation.isPending}
          className="px-3 py-1 rounded-lg text-xs bg-[var(--accent-teal)] text-white hover:opacity-90 disabled:opacity-50"
        >
          {mutation.isPending ? 'Saving…' : 'Complete'}
        </button>
      </div>
    </div>
  );
}

function RejectForm({ req, onDone, onCancel }) {
  const qc = useQueryClient();
  const [reason, setReason] = useState('');

  const mutation = useMutation({
    mutationFn: (data) => api.updateLabRequest(req.id, data),
    onSuccess: () => {
      toast.success('Request rejected');
      qc.invalidateQueries({ queryKey: ['lab-requests'] });
      qc.invalidateQueries({ queryKey: ['lab-pending', req.record_id] });
      onDone?.();
    },
    onError: () => toast.error('Failed to reject request'),
  });

  return (
    <div className="space-y-3 p-4 bg-[var(--bg-primary)]/40 rounded-lg border border-[var(--border-primary)]/40">
      <p className="text-xs font-medium text-[var(--text-primary)]">Reject request</p>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Reason for rejection"
        rows={2}
        className="w-full px-2 py-1.5 text-xs rounded-lg bg-[var(--bg-primary)] border border-[var(--border-primary)]/40 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-teal)]"
      />
      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="px-3 py-1 rounded-lg text-xs text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)]"
        >
          Cancel
        </button>
        <button
          onClick={() =>
            mutation.mutate({
              status: 'rejected',
              result_notes: reason.trim() || null,
            })
          }
          disabled={mutation.isPending}
          className="px-3 py-1 rounded-lg text-xs bg-[var(--status-critical)] text-white hover:opacity-90 disabled:opacity-50"
        >
          {mutation.isPending ? 'Rejecting…' : 'Reject'}
        </button>
      </div>
    </div>
  );
}

export default function LabQueue() {
  usePageTitle('Lab Queue');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [activeForm, setActiveForm] = useState(null);

  const params = useMemo(() => {
    const p = new URLSearchParams();
    if (statusFilter) p.set('status', statusFilter);
    if (priorityFilter) p.set('priority', priorityFilter);
    p.set('limit', '200');
    return p.toString();
  }, [statusFilter, priorityFilter]);

  const query = useQuery({
    queryKey: ['lab-requests', params],
    queryFn: () => api.listLabRequests(params),
    staleTime: 15_000,
  });

  const rows = query.data ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-[var(--text-primary)] flex items-center gap-2">
          <Beaker className="w-5 h-5 text-[var(--accent-teal)]" />
          Lab confirmation queue
        </h1>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">
          Requests from clinicians for laboratory confirmation of predicted MDR.
        </p>
      </div>

      <div className="rounded-2xl border border-[var(--border-primary)]/40 bg-[var(--bg-secondary)]/80 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1">
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s.value}
                onClick={() => setStatusFilter(s.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  statusFilter === s.value
                    ? 'bg-[var(--accent-teal)] text-white'
                    : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-primary)]'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          <div className="ml-auto flex gap-1">
            {['', 'routine', 'urgent', 'stat'].map((p) => (
              <button
                key={p || 'all'}
                onClick={() => setPriorityFilter(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  priorityFilter === p
                    ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] ring-1 ring-[var(--accent-teal)]'
                    : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-primary)]'
                }`}
              >
                {p || 'All priorities'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {query.isLoading ? (
        <Skeleton className="h-64" />
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border-primary)]/40 bg-[var(--bg-secondary)]/80 p-6">
          <EmptyState
            title="No requests"
            description={
              statusFilter === 'pending'
                ? 'The pending queue is clear.'
                : 'Adjust the filters above.'
            }
            icon={Beaker}
          />
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((req) => (
            <div
              key={req.id}
              className="rounded-2xl border border-[var(--border-primary)]/40 bg-[var(--bg-secondary)]/80 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-[var(--text-primary)]">
                      {req.isolate?.pathogen_code || 'Unnamed isolate'}
                    </span>
                    <span
                      className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        PRIORITY_TONE[req.priority] || PRIORITY_TONE.routine
                      }`}
                    >
                      {req.priority}
                    </span>
                    <span
                      className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        req.status === 'completed'
                          ? 'bg-[var(--status-success-bg)] text-[var(--status-success)]'
                          : req.status === 'rejected'
                            ? 'bg-[var(--status-critical-bg)] text-[var(--status-critical)]'
                            : 'bg-[var(--status-info-bg)] text-[var(--status-info)]'
                      }`}
                    >
                      {req.status}
                    </span>
                    {req.escalation_level > 0 && (
                      <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--status-critical-bg)] text-[var(--status-critical)]">
                        Escalated L{req.escalation_level}
                      </span>
                    )}
                    <SlaBadge label="Ack" sla={req.sla_acknowledge} />
                    <SlaBadge label="Complete" sla={req.sla_complete} />
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--text-muted)]">
                    <span>{req.isolate?.county || '—'}</span>
                    <span>·</span>
                    <span>{req.isolate?.specimen_type || '—'}</span>
                    {req.isolate?.mdr_flag != null && (
                      <>
                        <span>·</span>
                        <span>
                          predicted {req.isolate.mdr_flag ? 'MDR' : 'not MDR'}
                        </span>
                      </>
                    )}
                    {req.requested_at && (
                      <>
                        <span>·</span>
                        <span>{new Date(req.requested_at).toLocaleString()}</span>
                      </>
                    )}
                    {req.assigned_to_name && (
                      <>
                        <span>·</span>
                        <span>assigned to {req.assigned_to_name}</span>
                      </>
                    )}
                    {req.acknowledged_by_name && (
                      <>
                        <span>·</span>
                        <span>acked by {req.acknowledged_by_name}</span>
                      </>
                    )}
                  </div>
                  {req.notes && (
                    <p className="mt-2 text-xs text-[var(--text-secondary)] italic">
                      “{req.notes}”
                    </p>
                  )}
                  {req.result_notes && (
                    <p className="mt-2 text-xs text-[var(--text-secondary)]">
                      Result: {req.result_notes}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    to={`/history?record=${req.record_id}`}
                    className="text-xs text-[var(--accent-teal)] hover:underline"
                  >
                    View isolate
                  </Link>
                  {(req.status === 'pending' || req.status === 'in_progress') && (
                    <>
                      <button
                        onClick={() => setActiveForm({ req, mode: 'complete' })}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs bg-[var(--status-success)] text-white hover:opacity-90"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Complete
                      </button>
                      <button
                        onClick={() => setActiveForm({ req, mode: 'reject' })}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs bg-[var(--bg-tertiary)] text-[var(--status-critical)] hover:bg-[var(--bg-primary)]"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Reject
                      </button>
                    </>
                  )}
                </div>
              </div>

              {activeForm?.req?.id === req.id && activeForm.mode === 'complete' && (
                <div className="mt-3">
                  <CompleteForm
                    req={req}
                    onDone={() => setActiveForm(null)}
                    onCancel={() => setActiveForm(null)}
                  />
                </div>
              )}
              {activeForm?.req?.id === req.id && activeForm.mode === 'reject' && (
                <div className="mt-3">
                  <RejectForm
                    req={req}
                    onDone={() => setActiveForm(null)}
                    onCancel={() => setActiveForm(null)}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
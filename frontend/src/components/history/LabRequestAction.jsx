import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Beaker, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../../api/client';

const PRIORITIES = [
  { value: 'routine', label: 'Routine' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'stat', label: 'STAT' },
];

export default function LabRequestAction({ recordId, labConfirmed }) {
  const qc = useQueryClient();
  const [priority, setPriority] = useState('routine');
  const [notes, setNotes] = useState('');
  const [showForm, setShowForm] = useState(false);

  const pendingQuery = useQuery({
    queryKey: ['lab-pending', recordId],
    queryFn: () => api.getPendingLabRequest(recordId),
    enabled: !!recordId,
    staleTime: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: (payload) => api.createLabRequest(payload),
    onSuccess: () => {
      toast.success('Sent to lab');
      qc.invalidateQueries({ queryKey: ['lab-pending', recordId] });
      qc.invalidateQueries({ queryKey: ['lab-requests'] });
      setShowForm(false);
      setNotes('');
    },
    onError: () => toast.error('Failed to send to lab'),
  });

  const pending = pendingQuery.data;

  if (labConfirmed !== null && labConfirmed !== undefined) {
    return (
      <div className="rounded-[var(--radius-card)] border border-[var(--status-success)]/30 bg-[var(--status-success-bg)]/20 p-3 flex items-center gap-2 text-xs">
        <CheckCircle2 className="w-4 h-4 text-[var(--status-success)] flex-shrink-0" />
        <span className="text-[var(--text-secondary)]">
          Lab confirmed:{' '}
          <b className="text-[var(--text-primary)]">
            {labConfirmed ? 'MDR' : 'Not MDR'}
          </b>
        </span>
      </div>
    );
  }

  if (pending) {
    const tone =
      pending.priority === 'stat'
        ? 'var(--status-critical)'
        : pending.priority === 'urgent'
          ? 'var(--status-warning)'
          : 'var(--status-info)';
    return (
      <div
        className="rounded-[var(--radius-card)] border p-3 flex items-center gap-2 text-xs"
        style={{ borderColor: `${tone}40`, backgroundColor: `${tone}12` }}
      >
        <Clock className="w-4 h-4 flex-shrink-0" style={{ color: tone }} />
        <span className="text-[var(--text-secondary)]">
          Sent to lab ({pending.priority}) ·{' '}
          {pending.requested_at
            ? new Date(pending.requested_at).toLocaleDateString()
            : ''}
        </span>
      </div>
    );
  }

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-3">
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-[var(--accent-teal)] text-white hover:opacity-90 transition"
        >
          <Beaker className="w-3.5 h-3.5" />
          Send to lab for confirmation
        </button>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[var(--text-muted)]" />
            <span className="text-xs font-medium text-[var(--text-primary)]">
              Confirm this isolate with lab culture
            </span>
          </div>
          <div className="flex gap-2">
            {PRIORITIES.map((p) => (
              <button
                key={p.value}
                onClick={() => setPriority(p.value)}
                className={`px-2.5 py-1 rounded-md text-xs transition ${
                  priority === p.value
                    ? 'bg-[var(--accent-teal)] text-white'
                    : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-primary)]'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes for the lab (optional)"
            rows={2}
            className="w-full px-2 py-1.5 text-xs rounded-lg bg-[var(--bg-primary)] border border-[var(--border-primary)]/40 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-teal)]"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowForm(false)}
              className="px-3 py-1 rounded-lg text-xs text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)]"
            >
              Cancel
            </button>
            <button
              onClick={() =>
                createMutation.mutate({
                  record_id: recordId,
                  priority,
                  notes: notes.trim() || null,
                })
              }
              disabled={createMutation.isPending}
              className="px-3 py-1 rounded-lg text-xs bg-[var(--accent-teal)] text-white hover:opacity-90 disabled:opacity-50"
            >
              {createMutation.isPending ? 'Sending…' : 'Send'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
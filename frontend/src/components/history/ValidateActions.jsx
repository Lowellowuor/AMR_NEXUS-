import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Flag, XCircle, RotateCcw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import api from '../../api/client';

const ACTIONS = [
  {
    state: 'verified',
    label: 'Mark verified',
    icon: CheckCircle2,
    tone: 'text-[var(--status-success)]',
  },
  {
    state: 'flagged',
    label: 'Flag for review',
    icon: Flag,
    tone: 'text-[var(--status-warning)]',
  },
  {
    state: 'rejected',
    label: 'Reject',
    icon: XCircle,
    tone: 'text-[var(--status-critical)]',
  },
  {
    state: 'unverified',
    label: 'Reset to unverified',
    icon: RotateCcw,
    tone: 'text-[var(--text-muted)]',
  },
];

export default function ValidateActions({ recordId, currentState, onDone }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [selected, setSelected] = useState(null);

  const mutation = useMutation({
    mutationFn: ({ state, notes: n }) =>
      api.validateRecord(recordId, { state, notes: n }),
    onSuccess: (data) => {
      toast.success(`Validation: ${data.validation_state}`);
      qc.invalidateQueries({ queryKey: ['history'] });
      qc.invalidateQueries({ queryKey: ['history-record', recordId] });
      qc.invalidateQueries({ queryKey: ['case'] });
      setSelected(null);
      setNotes('');
      setOpen(false);
      onDone?.(data);
    },
    onError: () => toast.error('Failed to update validation'),
  });

  const handleSelect = (action) => {
    if (action.state === 'unverified') {
      mutation.mutate({ state: 'unverified', notes: null });
      return;
    }
    setSelected(action);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs px-2.5 py-1 rounded-lg bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] transition"
        title={`Current: ${currentState || 'unverified'}`}
      >
        Change validation
      </button>
    );
  }

  return (
    <div className="space-y-2 p-3 rounded-lg border border-[var(--border-primary)]/40 bg-[var(--bg-primary)]/40">
      {!selected ? (
        <div className="space-y-1">
          {ACTIONS.map((a) => {
            const Icon = a.icon;
            return (
              <button
                key={a.state}
                onClick={() => handleSelect(a)}
                disabled={a.state === currentState}
                className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-left text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <Icon className={`w-3.5 h-3.5 ${a.tone}`} />
                {a.label}
                {a.state === currentState && (
                  <span className="ml-auto text-[10px] text-[var(--text-muted)]">
                    current
                  </span>
                )}
              </button>
            );
          })}
          <button
            onClick={() => setOpen(false)}
            className="w-full text-xs px-3 py-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-secondary)]"
          >
            Cancel
          </button>
        </div>
      ) : (
        <>
          <p className="text-xs font-medium text-[var(--text-primary)]">
            {selected.label}
          </p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (optional)"
            rows={2}
            className="w-full px-2 py-1.5 text-xs rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-primary)]/40 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-teal)]"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setSelected(null);
                setNotes('');
              }}
              className="px-3 py-1 rounded-lg text-xs text-[var(--text-muted)] hover:bg-[var(--bg-secondary)]"
            >
              Back
            </button>
            <button
              onClick={() =>
                mutation.mutate({
                  state: selected.state,
                  notes: notes.trim() || null,
                })
              }
              disabled={mutation.isPending}
              className="px-3 py-1 rounded-lg text-xs bg-[var(--accent-teal)] text-white hover:opacity-90 disabled:opacity-50"
            >
              {mutation.isPending ? 'Saving…' : 'Confirm'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import api from '../../api/client';

const REASONS = [
  { value: 'resolved', label: 'Resolved — issue addressed' },
  { value: 'referred', label: 'Referred — escalated elsewhere' },
  { value: 'duplicate', label: 'Duplicate — covered by another case' },
  { value: 'insufficient_data', label: 'Insufficient data to act' },
  { value: 'no_action', label: 'No action required' },
  { value: 'other', label: 'Other' },
];

export default function CloseCaseDialog({ caseId, open, onClose, onDone }) {
  const qc = useQueryClient();
  const [reason, setReason] = useState('resolved');
  const [note, setNote] = useState('');

  const mutation = useMutation({
    mutationFn: () => api.closeCase(caseId, { reason, note: note.trim() || null }),
    onSuccess: () => {
      toast.success('Case closed');
      qc.invalidateQueries({ queryKey: ['case', String(caseId)] });
      qc.invalidateQueries({ queryKey: ['cases'] });
      setNote('');
      setReason('resolved');
      onDone?.();
      onClose?.();
    },
    onError: (e) => toast.error(e.message || 'Failed to close case'),
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-primary)] p-5 max-w-md w-full space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Close this case
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)]"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
            Reason
          </label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--bg-primary)] border border-[var(--border-primary)]/40 text-[var(--text-primary)]"
          >
            {REASONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
            Closing note (optional)
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Short summary of the outcome"
            className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--bg-primary)] border border-[var(--border-primary)]/40 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-teal)]"
          />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-xs text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)]"
          >
            Cancel
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs bg-[var(--accent-teal)] text-white hover:opacity-90 disabled:opacity-50"
          >
            <CheckIcon className="w-3.5 h-3.5" />
            {mutation.isPending ? 'Closing…' : 'Close case'}
          </button>
        </div>
      </div>
    </div>
  );
}
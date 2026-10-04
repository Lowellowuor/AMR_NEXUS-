import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeftIcon,
  ArrowDownTrayIcon,
  DocumentDuplicateIcon,
  MapPinIcon,
  BeakerIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/outline';
import api from '../api/client';
import { Skeleton } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import { formatNumber, formatPercent } from '../lib/format';
import { usePageTitle } from '../hooks/usePageTitle';

const STATUS_TONE = {
  open: 'bg-[var(--status-info-bg)] text-[var(--status-info)]',
  closed: 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]',
};

function CaseNotes({ caseId, initialNotes }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(initialNotes || '');

  useEffect(() => {
    setValue(initialNotes || '');
  }, [initialNotes]);

  const mutation = useMutation({
    mutationFn: (notes) => api.updateCase(caseId, { notes }),
    onSuccess: () => {
      toast.success('Notes saved');
      qc.invalidateQueries({ queryKey: ['case', String(caseId)] });
      setEditing(false);
    },
    onError: () => toast.error('Failed to save notes'),
  });

  return (
    <div className="rounded-2xl border border-[var(--border-primary)]/40 bg-[var(--bg-secondary)]/80 p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
          <PencilSquareIcon className="w-4 h-4 text-[var(--text-muted)]" />
          Case notes
        </h2>
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="text-xs px-3 py-1 rounded-lg text-[var(--accent-teal)] hover:bg-[var(--accent-teal)]/10 transition"
          >
            Edit
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => {
                setValue(initialNotes || '');
                setEditing(false);
              }}
              className="text-xs px-3 py-1 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] transition"
            >
              Cancel
            </button>
            <button
              onClick={() => mutation.mutate(value)}
              disabled={mutation.isPending}
              className="text-xs px-3 py-1 rounded-lg bg-[var(--accent-teal)] text-white hover:opacity-90 disabled:opacity-50"
            >
              {mutation.isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
        )}
      </div>
      {editing ? (
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={5}
          placeholder="Add clinical notes about this case…"
          className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--bg-primary)] border border-[var(--border-primary)]/40 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-teal)]"
        />
      ) : initialNotes ? (
        <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">
          {initialNotes}
        </p>
      ) : (
        <p className="text-sm text-[var(--text-muted)] italic">
          No notes yet. Click Edit to add.
        </p>
      )}
    </div>
  );
}

export default function CaseDetail() {
  const { id } = useParams();
  const query = useQuery({
    queryKey: ['case', id],
    queryFn: () => api.getCase(id),
    staleTime: 30_000,
  });

  usePageTitle(query.data ? `Case ${query.data.case_code}` : 'Case');

  if (query.isLoading) {
    return <Skeleton className="h-96" />;
  }

  if (query.isError || !query.data) {
    return (
      <div className="rounded-2xl border border-[var(--border-primary)]/40 bg-[var(--bg-secondary)]/80 p-6">
        <EmptyState
          title="Case not found"
          description="It may have been merged or removed."
        />
      </div>
    );
  }

  const c = query.data;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link
          to="/cases"
          className="inline-flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          All cases
        </Link>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)] tabular-nums">
            {c.case_code}
          </h1>
          <div className="flex items-center gap-2 mt-1 text-xs text-[var(--text-muted)]">
            <MapPinIcon className="w-3.5 h-3.5" />
            <span>{c.county}{c.sub_county ? ` · ${c.sub_county}` : ''}</span>
            <span>·</span>
            <BeakerIcon className="w-3.5 h-3.5" />
            <span className="capitalize">{c.sector || '—'}{c.species ? ` · ${c.species}` : ''}</span>
          </div>
        </div>
        <span
          className={`text-xs px-2.5 py-1 rounded-full font-medium ${
            STATUS_TONE[c.status] || STATUS_TONE.closed
          }`}
        >
          {c.status}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-[var(--border-primary)]/40 bg-[var(--bg-secondary)]/80 p-5">
          <p className="text-xs text-[var(--text-muted)] mb-1">Isolates</p>
          <p className="text-2xl font-bold tabular-nums text-[var(--text-primary)]">
            {formatNumber(c.isolate_count)}
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--border-primary)]/40 bg-[var(--bg-secondary)]/80 p-5">
          <p className="text-xs text-[var(--text-muted)] mb-1">MDR rate</p>
          <p className="text-2xl font-bold tabular-nums text-[var(--text-primary)]">
            {formatPercent(c.mdr_rate)}
          </p>
          <p className="text-[10px] text-[var(--text-muted)] mt-1">
            {formatNumber(c.mdr_count)} of {formatNumber(c.isolate_count)}
          </p>
        </div>
        <div className="rounded-2xl border border-[var(--border-primary)]/40 bg-[var(--bg-secondary)]/80 p-5">
          <p className="text-xs text-[var(--text-muted)] mb-1">First isolate</p>
          <p className="text-sm font-medium text-[var(--text-primary)]">
            {c.first_isolate_at ? new Date(c.first_isolate_at).toLocaleString() : '—'}
          </p>
          <p className="text-[10px] text-[var(--text-muted)] mt-1">
            Latest {c.latest_isolate_at ? new Date(c.latest_isolate_at).toLocaleString() : '—'}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border-primary)]/40 bg-[var(--bg-secondary)]/80 p-5">
        <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
          <DocumentDuplicateIcon className="w-4 h-4 text-[var(--text-muted)]" />
          Isolates in this case
        </h2>
        {c.isolates.length === 0 ? (
          <EmptyState title="No isolates linked" description="This case is currently empty." />
        ) : (
          <div className="overflow-hidden rounded-xl border border-[var(--border-primary)]/40">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-[var(--border-primary)]/40 bg-[var(--bg-primary)]/40">
                  <th className="px-3 py-2 font-medium text-[var(--text-muted)]">Pathogen</th>
                  <th className="px-3 py-2 font-medium text-[var(--text-muted)]">Specimen</th>
                  <th className="px-3 py-2 font-medium text-[var(--text-muted)]">Site</th>
                  <th className="px-3 py-2 font-medium text-[var(--text-muted)]">MDR</th>
                  <th className="px-3 py-2 font-medium text-[var(--text-muted)]">Collected</th>
                  <th className="px-3 py-2 font-medium text-[var(--text-muted)] text-right">Summary</th>
                </tr>
              </thead>
              <tbody>
                {c.isolates.map((r) => (
                  <tr key={r.record_id} className="border-b border-[var(--border-primary)]/20">
                    <td className="px-3 py-2 text-[var(--text-primary)]">
                      {r.pathogen_code || '—'}
                    </td>
                    <td className="px-3 py-2 text-[var(--text-secondary)]">
                      {r.specimen_type || '—'}
                    </td>
                    <td className="px-3 py-2 text-[var(--text-secondary)] tabular-nums">
                      {r.site_id ?? '—'}
                    </td>
                    <td className="px-3 py-2">
                      {r.mdr_flag ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--status-critical-bg)] text-[var(--status-critical)]">
                          MDR
                        </span>
                      ) : (
                        <span className="text-xs text-[var(--text-muted)]">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs text-[var(--text-muted)]">
                      {r.created_at ? new Date(r.created_at).toLocaleString() : '—'}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={() => {
                          api.downloadPredictionPdf(r.record_id)
                            .then((blob) => {
                              const a = document.createElement('a');
                              a.href = URL.createObjectURL(blob);
                              a.download = `amr_summary_${String(r.record_id).slice(0, 8)}.pdf`;
                              a.click();
                              URL.revokeObjectURL(a.href);
                            })
                            .catch(() => toast.error('PDF download failed'));
                        }}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs text-[var(--accent-teal)] hover:bg-[var(--accent-teal)]/10 transition"
                        title="Download clinical summary (PDF)"
                      >
                        <ArrowDownTrayIcon className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CaseNotes caseId={Number(id)} initialNotes={c.notes} />
    </div>
  );
}
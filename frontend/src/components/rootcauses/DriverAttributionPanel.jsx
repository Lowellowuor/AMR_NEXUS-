import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowTrendingUpIcon,
  InformationCircleIcon,
  ChatBubbleLeftEllipsisIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import api from '../../api/client';
import { Skeleton } from '../ui/Skeleton';
import { formatNumber, formatPercent } from '../../lib/format';

const CONFIDENCE_TONE = {
  high: 'bg-[var(--status-success-bg)] text-[var(--status-success)]',
  medium: 'bg-[var(--status-warning-bg)] text-[var(--status-warning)]',
  low: 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]',
};

function DriverAnnotations({ driverId, county, pathogen }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [note, setNote] = useState('');
  const [eventDate, setEventDate] = useState('');

  const params = new URLSearchParams();
  params.set('driver_id', driverId);
  if (county) params.set('county', county);
  if (pathogen) params.set('pathogen', pathogen);

  const query = useQuery({
    queryKey: ['driver-annotations', driverId, county, pathogen],
    queryFn: () => api.listDriverAnnotations(params.toString()),
    staleTime: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.createDriverAnnotation(data),
    onSuccess: () => {
      toast.success('Context saved');
      qc.invalidateQueries({ queryKey: ['driver-annotations'] });
      setNote('');
      setEventDate('');
      setShowForm(false);
    },
    onError: () => toast.error('Failed to save context'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.deleteDriverAnnotation(id),
    onSuccess: () => {
      toast.success('Context removed');
      qc.invalidateQueries({ queryKey: ['driver-annotations'] });
    },
  });

  const annotations = query.data ?? [];

  return (
    <div className="mt-3 pt-3 border-t border-[var(--border-primary)]/40">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          <ChatBubbleLeftEllipsisIcon className="w-3 h-3" />
          Analyst context ({annotations.length})
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="text-[10px] px-2 py-0.5 rounded-md text-[var(--accent-teal)] hover:bg-[var(--accent-teal)]/10"
          >
            + Add context
          </button>
        )}
      </div>

      {showForm && (
        <div className="space-y-2 mb-2 p-2 rounded-lg bg-[var(--bg-primary)]/40">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g., March spike coincided with a drug stockout"
            rows={2}
            className="w-full px-2 py-1.5 text-xs rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-primary)]/40 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-teal)]"
          />
          <input
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            className="w-full px-2 py-1 text-xs rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-primary)]/40 text-[var(--text-primary)]"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setShowForm(false);
                setNote('');
                setEventDate('');
              }}
              className="px-2 py-0.5 rounded text-[10px] text-[var(--text-muted)] hover:bg-[var(--bg-secondary)]"
            >
              Cancel
            </button>
            <button
              onClick={() =>
                createMutation.mutate({
                  driver_id: driverId,
                  scope_county: county || null,
                  scope_pathogen: pathogen || null,
                  note: note.trim(),
                  event_date: eventDate || null,
                })
              }
              disabled={!note.trim() || createMutation.isPending}
              className="px-2 py-0.5 rounded text-[10px] bg-[var(--accent-teal)] text-white hover:opacity-90 disabled:opacity-50"
            >
              {createMutation.isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {annotations.length > 0 && (
        <ul className="space-y-1.5">
          {annotations.map((a) => (
            <li
              key={a.id}
              className="flex items-start gap-2 text-xs text-[var(--text-secondary)] group"
            >
              <span className="flex-1 min-w-0">
                {a.note}
                <span className="block text-[10px] text-[var(--text-muted)] mt-0.5">
                  {a.created_by_name}
                  {a.event_date ? ` · ${a.event_date}` : ''}
                </span>
              </span>
              <button
                onClick={() => deleteMutation.mutate(a.id)}
                className="p-0.5 opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-[var(--status-critical)] transition"
                title="Remove"
              >
                <TrashIcon className="w-3 h-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function DriverRow({ d, maxDelta, county, pathogen }) {
  const isRecorded = !d.not_recorded;
  const delta = d.mdr_rate_delta ?? 0;
  const width = maxDelta > 0 ? Math.min((Math.abs(delta) / maxDelta) * 100, 100) : 0;
  const positive = delta > 0;

  return (
    <div className="rounded-xl border border-[var(--border-primary)]/40 p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            {d.label}
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            {isRecorded
              ? `${formatNumber(d.isolates_with_driver)} isolates (${formatPercent(
                  d.isolates_with_driver_pct,
                )} of scope)`
              : 'Not recorded in the current data'}
          </p>
        </div>
        <span
          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex-shrink-0 ${
            CONFIDENCE_TONE[d.confidence] || CONFIDENCE_TONE.low
          }`}
        >
          {d.confidence}
        </span>
      </div>

      {isRecorded ? (
        <>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <p className="text-[10px] text-[var(--text-muted)]">MDR with driver</p>
              <p className="text-sm font-semibold tabular-nums text-[var(--text-primary)]">
                {formatPercent(d.mdr_rate_with_driver)}
              </p>
              <p className="text-[10px] text-[var(--text-muted)]">
                CI {formatPercent(d.mdr_rate_confidence_low)}–
                {formatPercent(d.mdr_rate_confidence_high)}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-[var(--text-muted)]">MDR without</p>
              <p className="text-sm font-semibold tabular-nums text-[var(--text-primary)]">
                {formatPercent(d.mdr_rate_without_driver ?? 0)}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-[var(--text-muted)]">Difference</p>
              <p
                className={`text-sm font-semibold tabular-nums flex items-center gap-1 ${
                  positive ? 'text-[var(--status-critical)]' : 'text-[var(--status-success)]'
                }`}
              >
                {positive ? '+' : ''}
                {delta} pts
              </p>
            </div>
          </div>

          <div className="w-full h-1.5 rounded-full bg-[var(--bg-tertiary)] overflow-hidden mb-3">
            <div
              className={`h-full rounded-full ${
                positive ? 'bg-[var(--status-critical)]' : 'bg-[var(--status-success)]'
              }`}
              style={{ width: `${width}%` }}
            />
          </div>

          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            {d.attributable_note}
          </p>
        </>
      ) : (
        <p className="text-xs text-[var(--text-muted)] italic">
          This driver has no records in the current scope. Capture the field at
          submission to enable attribution.
        </p>
      )}

      <DriverAnnotations
        driverId={d.id}
        county={county}
        pathogen={pathogen}
      />
    </div>
  );
}

export default function DriverAttributionPanel({ county, pathogen, days }) {
  const params = new URLSearchParams();
  if (county) params.set('county', county);
  if (pathogen) params.set('pathogen', pathogen);
  if (days) params.set('days', String(days));

  const query = useQuery({
    queryKey: ['root-cause-drivers', county, pathogen, days],
    queryFn: () => api.getRootCauseDrivers(params.toString()),
    staleTime: 60_000,
  });

  if (query.isLoading) {
    return <Skeleton className="h-64" />;
  }

  if (query.isError || !query.data) return null;

  const { drivers, total_isolates, mdr_count, mdr_rate, caveat, no_data } =
    query.data;

  if (no_data) {
    return (
      <div className="rounded-2xl border border-[var(--border-primary)]/40 bg-[var(--bg-secondary)]/80 p-6">
        <p className="text-sm text-[var(--text-muted)]">
          No isolates in scope to compute driver attribution.
        </p>
      </div>
    );
  }

  const maxDelta = drivers.reduce(
    (m, d) => Math.max(m, Math.abs(d.mdr_rate_delta ?? 0)),
    0,
  );

  return (
    <div className="rounded-2xl border border-[var(--border-primary)]/40 bg-[var(--bg-secondary)]/80 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <ArrowTrendingUpIcon className="w-5 h-5 text-[var(--accent-teal)]" />
          <div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              Driver attribution
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              What the platform's data shows is actually driving resistance
            </p>
          </div>
        </div>
        <div className="text-right text-xs">
          <p className="text-[var(--text-muted)]">
            {formatNumber(total_isolates)} isolates ·{' '}
            {formatNumber(mdr_count)} MDR
          </p>
          <p className="text-[var(--text-primary)] font-semibold tabular-nums">
            {formatPercent(mdr_rate)} MDR rate
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {drivers.map((d) => (
          <DriverRow
            key={d.id}
            d={d}
            maxDelta={maxDelta}
            county={county}
            pathogen={pathogen}
          />
        ))}
      </div>

      <div className="mt-4 pt-3 border-t border-[var(--border-primary)]/40 flex items-start gap-2 text-xs text-[var(--text-muted)]">
        <InformationCircleIcon className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
        <span>{caveat}</span>
      </div>
    </div>
  );
}
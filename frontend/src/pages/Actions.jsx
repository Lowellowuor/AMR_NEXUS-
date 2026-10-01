import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PlusIcon,
  ClipboardDocumentListIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import { usePageTitle } from '../hooks/usePageTitle';
import api from '../api/client';
import { Skeleton } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import ActionDrawer from '../components/actions/ActionDrawer';
import { useAuth } from '../contexts/AuthContext';

const STATUSES = ['open', 'in_progress', 'done', 'cancelled'];
const PRIORITIES = ['critical', 'high', 'medium', 'low'];

const STATUS_LABEL = {
  open: 'Open',
  in_progress: 'In progress',
  done: 'Done',
  cancelled: 'Cancelled',
};

const STATUS_STYLE = {
  open: 'bg-[var(--status-warning)]/20 text-[var(--status-warning)]',
  in_progress: 'bg-[var(--accent-teal)]/20 text-[var(--accent-teal)]',
  done: 'bg-[var(--status-success)]/20 text-[var(--status-success)]',
  cancelled: 'bg-[var(--text-muted)]/20 text-[var(--text-muted)]',
};

const PRIORITY_STYLE = {
  critical: 'bg-[var(--status-critical)]/20 text-[var(--status-critical)]',
  high: 'bg-[var(--status-warning)]/20 text-[var(--status-warning)]',
  medium: 'bg-[var(--bg-tertiary)]/60 text-[var(--text-secondary)]',
  low: 'bg-[var(--bg-tertiary)]/60 text-[var(--text-muted)]',
};

const initialForm = {
  title: '',
  description: '',
  source_type: 'manual',
  source_id: '',
  priority: 'medium',
  county: '',
  sub_county: '',
  due_date: '',
};

function ActionForm({ onSubmit, onCancel, busy }) {
  const [form, setForm] = useState(initialForm);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { ...form };
    if (!payload.description) delete payload.description;
    if (!payload.source_id) delete payload.source_id;
    if (!payload.county) delete payload.county;
    if (!payload.sub_county) delete payload.sub_county;
    if (!payload.due_date) delete payload.due_date;
    onSubmit(payload);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-[var(--bg-secondary)]/80 p-5 rounded-2xl space-y-3"
    >
      <h2 className="text-lg font-semibold text-[var(--text-primary)]">
        New action
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input
          required
          placeholder="Title"
          value={form.title}
          onChange={(e) => set('title', e.target.value)}
          className="md:col-span-2 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg px-3 py-2 text-sm"
        />
        <select
          value={form.priority}
          onChange={(e) => set('priority', e.target.value)}
          className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg px-3 py-2 text-sm"
        >
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <input
          type="date"
          value={form.due_date}
          onChange={(e) => set('due_date', e.target.value)}
          className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg px-3 py-2 text-sm"
        />
        <input
          placeholder="County (optional)"
          value={form.county}
          onChange={(e) => set('county', e.target.value)}
          className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg px-3 py-2 text-sm"
        />
        <input
          placeholder="Sub-county (optional)"
          value={form.sub_county}
          onChange={(e) => set('sub_county', e.target.value)}
          className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg px-3 py-2 text-sm"
        />
        <input
          placeholder="Source id (alert or prediction record, optional)"
          value={form.source_id}
          onChange={(e) => set('source_id', e.target.value)}
          className="md:col-span-2 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg px-3 py-2 text-sm"
        />
      </div>
      <textarea
        placeholder="Description (optional)"
        value={form.description}
        onChange={(e) => set('description', e.target.value)}
        rows={3}
        className="w-full bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg px-3 py-2 text-sm"
      />
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-full text-sm border border-[var(--border-primary)]"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={busy}
          className="px-4 py-2 rounded-full text-sm bg-[var(--accent-teal)] text-white disabled:opacity-50"
        >
          {busy ? 'Saving…' : 'Create'}
        </button>
      </div>
    </form>
  );
}

export default function Actions() {
  usePageTitle('Actions');
  const { user } = useAuth();
  const qc = useQueryClient();

  const [tab, setTab] = useState('all'); // all | mine
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    county: '',
  });
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const canModify = (a) =>
    user?.role === 'admin' ||
    a.created_by === user?.id ||
    a.assigned_to === user?.id;

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    if (filters.status) p.set('status', filters.status);
    if (filters.priority) p.set('priority', filters.priority);
    if (filters.county) p.set('county', filters.county);
    p.set('limit', '200');
    return p.toString();
  }, [filters]);

  const actionsQuery = useQuery({
    queryKey: ['actions', queryString],
    queryFn: () => api.getActions(queryString),
    enabled: tab === 'all',
  });

  const myActionsQuery = useQuery({
    queryKey: ['my-actions', filters.status],
    queryFn: () =>
      api.getMyActions(filters.status ? `status=${filters.status}` : ''),
    enabled: tab === 'mine',
  });

  const activeQuery = tab === 'all' ? actionsQuery : myActionsQuery;

  const createMutation = useMutation({
    mutationFn: (payload) => api.createAction(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['actions'] });
      qc.invalidateQueries({ queryKey: ['my-actions'] });
      setShowForm(false);
    },
  });

  const list = activeQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            Actions
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Follow-up on alerts and predictions.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1 px-4 py-2 rounded-full text-sm bg-[var(--accent-teal)] text-white"
        >
          <PlusIcon className="h-4 w-4" />
          New action
        </button>
      </div>

      {showForm && (
        <ActionForm
          busy={createMutation.isPending}
          onCancel={() => setShowForm(false)}
          onSubmit={(payload) => createMutation.mutate(payload)}
        />
      )}

      <div className="flex gap-2 border-b border-[var(--border-primary)]/60">
        <button
          type="button"
          onClick={() => setTab('all')}
          className={`px-4 py-2 text-sm font-medium -mb-px border-b-2 ${
            tab === 'all'
              ? 'border-[var(--accent-teal)] text-[var(--accent-teal)]'
              : 'border-transparent text-[var(--text-muted)]'
          }`}
        >
          All actions
        </button>
        <button
          type="button"
          onClick={() => setTab('mine')}
          className={`px-4 py-2 text-sm font-medium -mb-px border-b-2 flex items-center gap-1 ${
            tab === 'mine'
              ? 'border-[var(--accent-teal)] text-[var(--accent-teal)]'
              : 'border-transparent text-[var(--text-muted)]'
          }`}
        >
          <UserCircleIcon className="h-4 w-4" />
          My actions
        </button>
      </div>

      <div className="bg-[var(--bg-secondary)]/80 p-4 rounded-2xl flex flex-wrap gap-3 items-center">
        <select
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
          className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </select>
        {tab === 'all' && (
          <>
            <select
              value={filters.priority}
              onChange={(e) =>
                setFilters((f) => ({ ...f, priority: e.target.value }))
              }
              className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg px-3 py-2 text-sm"
            >
              <option value="">All priorities</option>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <input
              placeholder="County"
              value={filters.county}
              onChange={(e) =>
                setFilters((f) => ({ ...f, county: e.target.value }))
              }
              className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg px-3 py-2 text-sm"
            />
          </>
        )}
      </div>

      <div className="bg-[var(--bg-secondary)]/80 rounded-2xl overflow-hidden">
        {activeQuery.isLoading ? (
          <div className="p-5"><Skeleton className="h-40" /></div>
        ) : list.length === 0 ? (
          <EmptyState
            title={tab === 'mine' ? 'No actions assigned to you' : 'No actions yet'}
            description="Actions track follow-up on alerts and predictions. Create one from an alert, a prediction, or manually."
            icon={ClipboardDocumentListIcon}
          />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg-tertiary)]/40">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-[var(--text-muted)]">Title</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--text-muted)]">Status</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--text-muted)]">Priority</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--text-muted)]">County</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--text-muted)]">Due</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--text-muted)]">Source</th>
              </tr>
            </thead>
            <tbody>
              {list.map((a) => (
                <tr
                  key={a.id}
                  onClick={() => setSelected(a)}
                  className="border-t border-[var(--border-primary)]/40 cursor-pointer hover:bg-[var(--bg-tertiary)]/30"
                >
                  <td className="px-4 py-3 text-[var(--text-primary)]">{a.title}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        STATUS_STYLE[a.status] || ''
                      }`}
                    >
                      {STATUS_LABEL[a.status] || a.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        PRIORITY_STYLE[a.priority] || ''
                      }`}
                    >
                      {a.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">
                    {a.county || '—'}
                  </td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">
                    {a.due_date ? String(a.due_date).slice(0, 10) : '—'}
                  </td>
                  <td className="px-4 py-3 text-[var(--text-muted)] text-xs">
                    {a.source_type}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ActionDrawer
        action={selected}
        onClose={() => setSelected(null)}
        canModify={selected ? canModify(selected) : false}
      />
    </div>
  );
}
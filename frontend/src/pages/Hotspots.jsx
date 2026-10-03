import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  PlusIcon,
  RefreshCw,
  Pencil,
  MapPinIcon,
  Trash2,
} from 'lucide-react';
import { usePageTitle } from '../hooks/usePageTitle';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/client';
import { Skeleton } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import HotspotFormModal from '../components/hotspots/HotspotFormModal';
import { formatNumber, formatPercent } from '../lib/format';

const TYPE_LABEL = {
  hospital: 'Hospital',
  clinic: 'Clinic',
  farm: 'Farm',
  market: 'Market',
  abattoir: 'Abattoir',
  environmental: 'Environmental',
  other: 'Other',
};

export default function Hotspots() {
  usePageTitle('Hotspots');
  const { user } = useAuth();
  const qc = useQueryClient();
  const isAdmin = user?.role === 'admin';

  const [county, setCounty] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const optionsQuery = useQuery({
    queryKey: ['hotspot-options'],
    queryFn: () => api.getOptions(),
    staleTime: 10 * 60 * 1000,
  });

  const listQuery = useQuery({
    queryKey: ['hotspots-list', county],
    queryFn: () => api.getHotspots(county ? `county=${encodeURIComponent(county)}` : ''),
    staleTime: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: (payload) => api.createHotspot(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hotspots-list'] });
      qc.invalidateQueries({ queryKey: ['hotspots'] });
      setShowForm(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.updateHotspot(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hotspots-list'] });
      qc.invalidateQueries({ queryKey: ['hotspots'] });
      setShowForm(false);
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.deleteHotspot(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hotspots-list'] });
      qc.invalidateQueries({ queryKey: ['hotspots'] });
      setConfirmDelete(null);
    },
  });

  const list = useMemo(() => listQuery.data ?? [], [listQuery.data]);
  const counties = optionsQuery.data?.counties ?? [];

  const openCreate = () => {
    setEditing(null);
    setShowForm(true);
  };

  const openEdit = (h) => {
    setEditing(h);
    setShowForm(true);
  };

  const confirmDeleteHotspot = (h) => {
    setConfirmDelete({
      title: `Deactivate "${h.name}"?`,
      description:
        'The hotspot will be hidden from the map and every dashboard. Historical data linked to it remains.',
      confirmLabel: 'Deactivate',
      destructive: true,
      onConfirm: () => deleteMutation.mutate(h.id),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            Hotspots
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Geographic anchors for sample collection. Shown on national and
            county dashboards. {list.length} active.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => listQuery.refetch()}
            disabled={listQuery.isFetching}
            className="flex items-center gap-2 px-4 py-2 rounded-full border border-[var(--border-primary)] text-sm hover:bg-[var(--bg-tertiary)]/60 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${listQuery.isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          {isAdmin && (
            <button
              type="button"
              onClick={openCreate}
              className="flex items-center gap-1 px-4 py-2 rounded-full text-sm bg-[var(--accent-teal)] text-white"
            >
              <PlusIcon className="h-4 w-4" />
              New hotspot
            </button>
          )}
        </div>
      </div>

      <div className="bg-[var(--bg-secondary)]/80 rounded-2xl p-4">
        <select
          value={county}
          onChange={(e) => setCounty(e.target.value)}
          className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All counties</option>
          {counties.map((c) => (
            <option key={c.code || c} value={c.code || c}>
              {c.name || c}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-[var(--bg-secondary)]/80 rounded-2xl overflow-hidden">
        {listQuery.isLoading ? (
          <div className="p-5"><Skeleton className="h-40" /></div>
        ) : list.length === 0 ? (
          <EmptyState
            icon={MapPinIcon}
            title={county ? 'No hotspots in this county' : 'No hotspots yet'}
            description={
              isAdmin
                ? 'Create the first hotspot to anchor sample collection on the map.'
                : 'An administrator can create hotspots for this deployment.'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--bg-tertiary)]/40">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-[var(--text-muted)]">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-[var(--text-muted)]">Type</th>
                  <th className="text-left px-4 py-3 font-medium text-[var(--text-muted)]">County</th>
                  <th className="text-left px-4 py-3 font-medium text-[var(--text-muted)]">Sub-county</th>
                  <th className="text-right px-4 py-3 font-medium text-[var(--text-muted)]">Samples</th>
                  <th className="text-right px-4 py-3 font-medium text-[var(--text-muted)]">MDR rate</th>
                  {isAdmin && (
                    <th className="text-right px-4 py-3 font-medium text-[var(--text-muted)]">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {list.map((h) => (
                  <tr
                    key={h.id}
                    className="border-t border-[var(--border-primary)]/40 hover:bg-[var(--bg-tertiary)]/20"
                  >
                    <td className="px-4 py-3 text-[var(--text-primary)] font-medium">
                      {h.name}
                    </td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">
                      {TYPE_LABEL[h.type] || h.type}
                    </td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">
                      {h.county || '—'}
                    </td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">
                      {h.sub_county || '—'}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-[var(--text-secondary)]">
                      {formatNumber(h.total_samples ?? 0)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium">
                      <span
                        className={
                          (h.resistance_rate ?? 0) >= 50
                            ? 'text-[var(--status-critical)]'
                            : (h.resistance_rate ?? 0) >= 30
                            ? 'text-[var(--status-warning)]'
                            : 'text-[var(--text-primary)]'
                        }
                      >
                        {formatPercent(h.resistance_rate ?? 0)}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(h)}
                            className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => confirmDeleteHotspot(h)}
                            className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--status-critical)] hover:bg-[var(--bg-tertiary)]"
                            title="Deactivate"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <HotspotFormModal
        key={editing?.id ?? (showForm ? 'new' : 'closed')}
        open={showForm}
        editing={editing}
        counties={counties}
        busy={createMutation.isPending || updateMutation.isPending}
        onClose={() => {
          setShowForm(false);
          setEditing(null);
        }}
        onSubmit={(payload) => {
          if (editing) {
            updateMutation.mutate({ id: editing.id, data: payload });
          } else {
            createMutation.mutate(payload);
          }
        }}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        title={confirmDelete?.title}
        description={confirmDelete?.description}
        confirmLabel={confirmDelete?.confirmLabel}
        destructive={confirmDelete?.destructive}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete?.onConfirm()}
      />
    </div>
  );
}
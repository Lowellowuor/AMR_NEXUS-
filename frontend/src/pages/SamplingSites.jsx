import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPinIcon, PlusIcon } from '@heroicons/react/24/outline';
import { usePageTitle } from '../hooks/usePageTitle';
import api from '../api/client';
import { Skeleton } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import SiteDrawer from '../components/sites/SiteDrawer';
import { useAuth } from '../contexts/AuthContext';

const SECTORS = ['human', 'animal', 'environment'];
const SITE_TYPES = [
  'farm', 'clinic', 'market', 'abattoir', 'environmental', 'other',
];

const SECTOR_COLOUR = {
  human: '#3b82f6',
  animal: '#f59e0b',
  environment: '#10b981',
};

const initialForm = {
  name: '',
  county: '',
  sub_county: '',
  sector: 'human',
  site_type: 'other',
  latitude: '',
  longitude: '',
  owner_name: '',
  owner_contact: '',
  notes: '',
};

function SiteForm({ onSubmit, onCancel, busy }) {
  const [form, setForm] = useState(initialForm);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { ...form };
    // Coerce blanks to nulls; parse numbers.
    if (!payload.sub_county) delete payload.sub_county;
    if (!payload.owner_name) delete payload.owner_name;
    if (!payload.owner_contact) delete payload.owner_contact;
    if (!payload.notes) delete payload.notes;
    payload.latitude = form.latitude === '' ? null : parseFloat(form.latitude);
    payload.longitude = form.longitude === '' ? null : parseFloat(form.longitude);
    onSubmit(payload);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-[var(--bg-secondary)]/80 p-5 rounded-2xl space-y-3"
    >
      <h2 className="text-lg font-semibold text-[var(--text-primary)]">
        New sampling site
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input
          required
          placeholder="Name"
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg px-3 py-2 text-sm"
        />
        <input
          required
          placeholder="County"
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
        <select
          value={form.sector}
          onChange={(e) => set('sector', e.target.value)}
          className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg px-3 py-2 text-sm"
        >
          {SECTORS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={form.site_type}
          onChange={(e) => set('site_type', e.target.value)}
          className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg px-3 py-2 text-sm"
        >
          {SITE_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <input
          placeholder="Latitude (optional)"
          value={form.latitude}
          onChange={(e) => set('latitude', e.target.value)}
          className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg px-3 py-2 text-sm"
        />
        <input
          placeholder="Longitude (optional)"
          value={form.longitude}
          onChange={(e) => set('longitude', e.target.value)}
          className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg px-3 py-2 text-sm"
        />
        <input
          placeholder="Owner name (optional)"
          value={form.owner_name}
          onChange={(e) => set('owner_name', e.target.value)}
          className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg px-3 py-2 text-sm"
        />
      </div>
      <textarea
        placeholder="Notes (optional)"
        value={form.notes}
        onChange={(e) => set('notes', e.target.value)}
        rows={2}
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

export default function SamplingSites() {
  usePageTitle('Sampling Sites');
  const { user } = useAuth();
  const qc = useQueryClient();
  const canManage = user?.role === 'admin' || user?.role === 'analyst';

  const [filters, setFilters] = useState({
    county: '',
    sector: '',
    site_type: '',
    active_only: 'true',
  });
  const [selectedSite, setSelectedSite] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    if (filters.county) p.set('county', filters.county);
    if (filters.sector) p.set('sector', filters.sector);
    if (filters.site_type) p.set('site_type', filters.site_type);
    p.set('active_only', filters.active_only);
    return p.toString();
  }, [filters]);

  const sites = useQuery({
    queryKey: ['sampling-sites', queryString],
    queryFn: () => api.getSamplingSites(queryString),
  });

  const createMutation = useMutation({
    mutationFn: (payload) => api.createSamplingSite(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sampling-sites'] });
      setShowForm(false);
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id) => api.deactivateSamplingSite(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sampling-sites'] });
      setSelectedSite(null);
    },
  });

  const list = sites.data ?? [];
  const mappable = list.filter(
    (s) => s.latitude != null && s.longitude != null,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            Sampling Sites
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Farms, clinics, markets, abattoirs, and environmental points.
          </p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-1 px-4 py-2 rounded-full text-sm bg-[var(--accent-teal)] text-white"
          >
            <PlusIcon className="h-4 w-4" />
            New site
          </button>
        )}
      </div>

      {showForm && (
        <SiteForm
          busy={createMutation.isPending}
          onCancel={() => setShowForm(false)}
          onSubmit={(payload) => createMutation.mutate(payload)}
        />
      )}

      <div className="bg-[var(--bg-secondary)]/80 p-4 rounded-2xl flex flex-wrap gap-3 items-center">
        <input
          placeholder="County"
          value={filters.county}
          onChange={(e) => setFilters((f) => ({ ...f, county: e.target.value }))}
          className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg px-3 py-2 text-sm"
        />
        <select
          value={filters.sector}
          onChange={(e) => setFilters((f) => ({ ...f, sector: e.target.value }))}
          className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All sectors</option>
          {SECTORS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={filters.site_type}
          onChange={(e) => setFilters((f) => ({ ...f, site_type: e.target.value }))}
          className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All types</option>
          {SITE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <input
            type="checkbox"
            checked={filters.active_only === 'true'}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                active_only: e.target.checked ? 'true' : 'false',
              }))
            }
          />
          Active only
        </label>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[var(--bg-secondary)]/80 rounded-2xl overflow-hidden">
          {sites.isLoading ? (
            <div className="p-5"><Skeleton className="h-40" /></div>
          ) : list.length === 0 ? (
            <EmptyState
              title="No sampling sites yet"
              description="Create the first site to begin tagging isolates to specific places."
              icon={MapPinIcon}
            />
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-[var(--bg-tertiary)]/40">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-[var(--text-muted)]">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-[var(--text-muted)]">Type</th>
                  <th className="text-left px-4 py-3 font-medium text-[var(--text-muted)]">Sector</th>
                  <th className="text-left px-4 py-3 font-medium text-[var(--text-muted)]">County</th>
                  <th className="text-left px-4 py-3 font-medium text-[var(--text-muted)]">Status</th>
                </tr>
              </thead>
              <tbody>
                {list.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => setSelectedSite(s)}
                    className="border-t border-[var(--border-primary)]/40 cursor-pointer hover:bg-[var(--bg-tertiary)]/30"
                  >
                    <td className="px-4 py-3 text-[var(--text-primary)]">{s.name}</td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">{s.site_type}</td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-block w-2 h-2 rounded-full mr-2"
                        style={{ backgroundColor: SECTOR_COLOUR[s.sector] || '#888' }}
                      />
                      <span className="text-[var(--text-secondary)]">{s.sector}</span>
                    </td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">{s.county}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          s.is_active
                            ? 'bg-[var(--status-success)]/20 text-[var(--status-success)]'
                            : 'bg-[var(--text-muted)]/20 text-[var(--text-muted)]'
                        }`}
                      >
                        {s.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="bg-[var(--bg-secondary)]/80 rounded-2xl overflow-hidden" style={{ minHeight: 400 }}>
          {mappable.length === 0 ? (
            <div className="p-5">
              <EmptyState
                title="No mapped sites"
                description="Sites with latitude and longitude will appear here."
                icon={MapPinIcon}
              />
            </div>
          ) : (
            <MapContainer
              center={[-0.5, 37.0]}
              zoom={6}
              style={{ height: 400, width: '100%' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap'
              />
              {mappable.map((s) => (
                <CircleMarker
                  key={s.id}
                  center={[Number(s.latitude), Number(s.longitude)]}
                  radius={8}
                  pathOptions={{
                    color: SECTOR_COLOUR[s.sector] || '#888',
                    fillOpacity: 0.6,
                  }}
                  eventHandlers={{ click: () => setSelectedSite(s) }}
                >
                  <Tooltip>{s.name}</Tooltip>
                </CircleMarker>
              ))}
            </MapContainer>
          )}
        </div>
      </div>

      <SiteDrawer
        site={selectedSite}
        onClose={() => setSelectedSite(null)}
        canManage={canManage}
        onDeactivate={(s) => {
          if (window.confirm(`Deactivate "${s.name}"?`)) {
            deactivateMutation.mutate(s.id);
          }
        }}
      />
    </div>
  );
}
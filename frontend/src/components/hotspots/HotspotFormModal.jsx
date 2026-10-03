import { useState } from 'react';
import { X } from 'lucide-react';

const HOTSPOT_TYPES = [
  'hospital',
  'clinic',
  'farm',
  'market',
  'abattoir',
  'environmental',
  'other',
];

const empty = {
  name: '',
  type: 'clinic',
  latitude: '',
  longitude: '',
  county: '',
  sub_county: '',
  address: '',
  contact: '',
};

export default function HotspotFormModal({ open, editing, counties = [], onSubmit, onClose, busy }) {
  // Initialise from props on mount. Parent passes a `key` to force remount.
  const [form, setForm] = useState(() => {
    if (editing) {
      return {
        name: editing.name || '',
        type: editing.type || 'clinic',
        latitude: editing.latitude != null ? String(editing.latitude) : '',
        longitude: editing.longitude != null ? String(editing.longitude) : '',
        county: editing.county || '',
        sub_county: editing.sub_county || '',
        address: editing.address || '',
        contact: editing.contact || '',
      };
    }
    return empty;
  });

  if (!open) return null;

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      name: form.name.trim(),
      type: form.type,
      latitude: parseFloat(form.latitude),
      longitude: parseFloat(form.longitude),
      county: form.county.trim(),
    };
    if (form.sub_county) payload.sub_county = form.sub_county.trim();
    if (form.address) payload.address = form.address.trim();
    if (form.contact) payload.contact = form.contact.trim();
    onSubmit(payload);
  };

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <form
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-2xl rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between px-5 pt-5 pb-4">
          <div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              {editing ? 'Edit hotspot' : 'New hotspot'}
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Hotspots anchor sample collection points on the map.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)]"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            required
            placeholder="Name *"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            className="md:col-span-2 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg px-3 py-2 text-sm"
          />
          <select
            value={form.type}
            onChange={(e) => set('type', e.target.value)}
            className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg px-3 py-2 text-sm"
          >
            {HOTSPOT_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <select
            required
            value={form.county}
            onChange={(e) => set('county', e.target.value)}
            className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg px-3 py-2 text-sm"
          >
            <option value="">County *</option>
            {counties.map((c) => (
              <option key={c.code || c} value={c.code || c}>
                {c.name || c}
              </option>
            ))}
          </select>
          <input
            placeholder="Sub-county"
            value={form.sub_county}
            onChange={(e) => set('sub_county', e.target.value)}
            className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg px-3 py-2 text-sm"
          />
          <input
            placeholder="Address"
            value={form.address}
            onChange={(e) => set('address', e.target.value)}
            className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg px-3 py-2 text-sm"
          />
          <input
            required
            type="number"
            step="any"
            placeholder="Latitude *"
            value={form.latitude}
            onChange={(e) => set('latitude', e.target.value)}
            className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg px-3 py-2 text-sm"
          />
          <input
            required
            type="number"
            step="any"
            placeholder="Longitude *"
            value={form.longitude}
            onChange={(e) => set('longitude', e.target.value)}
            className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg px-3 py-2 text-sm"
          />
          <input
            placeholder="Contact (phone / email)"
            value={form.contact}
            onChange={(e) => set('contact', e.target.value)}
            className="md:col-span-2 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg px-3 py-2 text-sm"
          />
        </div>

        <div className="flex justify-end gap-2 px-5 py-5 mt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-full border border-[var(--border-primary)] text-[var(--text-secondary)] text-sm font-medium hover:bg-[var(--bg-tertiary)]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="px-4 py-2 rounded-full bg-[var(--accent-teal)] text-white text-sm font-medium disabled:opacity-50"
          >
            {busy ? 'Saving…' : editing ? 'Save changes' : 'Create hotspot'}
          </button>
        </div>
      </form>
    </div>
  );
}
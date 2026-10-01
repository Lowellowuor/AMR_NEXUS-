import { useState } from 'react';
import { X } from 'lucide-react';

const ROLES = ['admin', 'analyst', 'clinician', 'viewer'];

const ROLE_LABEL = {
  admin: 'Administrator',
  analyst: 'Analyst',
  clinician: 'Clinician',
  viewer: 'Viewer',
};

const emptyForm = {
  name: '',
  email: '',
  role: 'analyst',
  assigned_county: '',
};

export default function UserFormModal({ open, editing, counties = [], onSubmit, onClose, busy }) {
  // Initialise from props once per mount. Parent uses a `key` prop so the
  // component remounts when `editing` or `open` changes.
  const [form, setForm] = useState(() => {
    if (editing) {
      return {
        name: editing.name || '',
        email: editing.email || '',
        role: editing.role || 'analyst',
        assigned_county: editing.assigned_county || '',
      };
    }
    return emptyForm;
  });

  if (!open) return null;

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      name: form.name,
      role: form.role,
    };
    if (form.assigned_county) payload.assigned_county = form.assigned_county;
    if (!editing) payload.email = form.email;
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
        className="relative w-full max-w-lg rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] shadow-2xl"
      >
        <div className="flex items-start justify-between px-5 pt-5 pb-4">
          <div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              {editing ? 'Edit user' : 'Create user'}
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              {editing
                ? 'Name, role, and county can be changed. Email is fixed.'
                : 'A temporary password will be generated and shown once.'}
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
            placeholder="Full name *"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            className="md:col-span-2 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg px-3 py-2 text-sm"
          />
          <input
            required
            type="email"
            placeholder="Email *"
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
            disabled={!!editing}
            className="md:col-span-2 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg px-3 py-2 text-sm disabled:opacity-50"
          />
          <select
            value={form.role}
            onChange={(e) => set('role', e.target.value)}
            className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg px-3 py-2 text-sm"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>{ROLE_LABEL[r]}</option>
            ))}
          </select>
          <select
            value={form.assigned_county}
            onChange={(e) => set('assigned_county', e.target.value)}
            className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg px-3 py-2 text-sm"
          >
            <option value="">No county assignment</option>
            {counties.map((c) => (
              <option key={c.code || c} value={c.code || c}>
                {c.name || c}
              </option>
            ))}
          </select>
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
            {busy ? 'Saving…' : editing ? 'Save changes' : 'Create user'}
          </button>
        </div>
      </form>
    </div>
  );
}
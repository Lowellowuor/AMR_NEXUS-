import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

const WHO_CATEGORIES = ['Access', 'Watch', 'Reserve'];

const initial = {
  name: '',
  atc_code: '',
  who_category: '',
  route: '',
  species_approved: '',
};

export default function DrugForm({ open, onSubmit, onClose, busy }) {
  const [form, setForm] = useState(initial);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { ...form };
    if (!payload.atc_code) delete payload.atc_code;
    if (!payload.who_category) delete payload.who_category;
    if (!payload.route) delete payload.route;
    if (!payload.species_approved) delete payload.species_approved;
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
              Add drug reference
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Canonical drug entry for AMU records.
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
            placeholder="Drug name *"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            className="md:col-span-2 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg px-3 py-2 text-sm"
          />
          <input
            placeholder="ATC code"
            value={form.atc_code}
            onChange={(e) => set('atc_code', e.target.value)}
            className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg px-3 py-2 text-sm"
          />
          <select
            value={form.who_category}
            onChange={(e) => set('who_category', e.target.value)}
            className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg px-3 py-2 text-sm"
          >
            <option value="">WHO category</option>
            {WHO_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <input
            placeholder="Route (e.g. oral, IV)"
            value={form.route}
            onChange={(e) => set('route', e.target.value)}
            className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg px-3 py-2 text-sm"
          />
          <input
            placeholder="Species approved"
            value={form.species_approved}
            onChange={(e) => set('species_approved', e.target.value)}
            className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg px-3 py-2 text-sm"
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
            {busy ? 'Saving…' : 'Add drug'}
          </button>
        </div>
      </form>
    </div>
  );
}
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

const SECTORS = ['human', 'animal', 'environment'];
const UNITS = ['mg', 'g', 'kg', 'ml', 'l', 'tablet', 'dose', 'iu', 'unit'];

const initial = {
  drug_id: '',
  county: '',
  sub_county: '',
  sector: 'human',
  species: '',
  quantity: '',
  unit: 'mg',
  period_start: '',
  period_end: '',
  source: '',
  notes: '',
};

export default function ConsumptionForm({ open, drugs, onSubmit, onClose, busy }) {
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
    const payload = {
      drug_id: parseInt(form.drug_id, 10),
      county: form.county,
      sector: form.sector,
      quantity: parseFloat(form.quantity),
      unit: form.unit,
      period_start: new Date(form.period_start).toISOString(),
      period_end: new Date(form.period_end).toISOString(),
    };
    if (form.sub_county) payload.sub_county = form.sub_county;
    if (form.species) payload.species = form.species;
    if (form.source) payload.source = form.source;
    if (form.notes) payload.notes = form.notes;
    onSubmit(payload);
  };

  const hasDrugs = Array.isArray(drugs) && drugs.length > 0;

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
              Record consumption
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              One row per use event. Raw quantity + unit; normalisation is
              handled downstream.
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

        {!hasDrugs && (
          <div className="mx-5 mb-3 p-3 rounded-lg bg-[var(--status-warning-bg)]/30 text-[var(--status-warning)] text-sm">
            No drugs in the reference list yet. Add a drug first.
          </div>
        )}

        <div className="px-5 grid grid-cols-1 md:grid-cols-2 gap-3">
          <select
            required
            value={form.drug_id}
            onChange={(e) => set('drug_id', e.target.value)}
            disabled={!hasDrugs}
            className="md:col-span-2 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg px-3 py-2 text-sm disabled:opacity-50"
          >
            <option value="">Select drug *</option>
            {(drugs ?? []).map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}{d.who_category ? ` (${d.who_category})` : ''}
              </option>
            ))}
          </select>

          <input
            required
            placeholder="County *"
            value={form.county}
            onChange={(e) => set('county', e.target.value)}
            className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg px-3 py-2 text-sm"
          />
          <input
            placeholder="Sub-county"
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
          <input
            placeholder="Species (e.g. cattle)"
            value={form.species}
            onChange={(e) => set('species', e.target.value)}
            className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg px-3 py-2 text-sm"
          />
          <input
            required
            type="number"
            step="any"
            min="0"
            placeholder="Quantity *"
            value={form.quantity}
            onChange={(e) => set('quantity', e.target.value)}
            className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg px-3 py-2 text-sm"
          />
          <select
            value={form.unit}
            onChange={(e) => set('unit', e.target.value)}
            className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg px-3 py-2 text-sm"
          >
            {UNITS.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
          <label className="text-xs text-[var(--text-muted)] flex flex-col">
            Period start *
            <input
              required
              type="date"
              value={form.period_start}
              onChange={(e) => set('period_start', e.target.value)}
              className="mt-1 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg px-3 py-2 text-sm"
            />
          </label>
          <label className="text-xs text-[var(--text-muted)] flex flex-col">
            Period end *
            <input
              required
              type="date"
              value={form.period_end}
              onChange={(e) => set('period_end', e.target.value)}
              className="mt-1 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg px-3 py-2 text-sm"
            />
          </label>
          <input
            placeholder="Source (e.g. vet report)"
            value={form.source}
            onChange={(e) => set('source', e.target.value)}
            className="md:col-span-2 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg px-3 py-2 text-sm"
          />
          <textarea
            placeholder="Notes"
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            rows={2}
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
            disabled={busy || !hasDrugs}
            className="px-4 py-2 rounded-full bg-[var(--accent-teal)] text-white text-sm font-medium disabled:opacity-50"
          >
            {busy ? 'Saving…' : 'Record consumption'}
          </button>
        </div>
      </form>
    </div>
  );
}
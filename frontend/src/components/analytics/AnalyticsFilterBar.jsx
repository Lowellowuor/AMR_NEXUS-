import { Calendar, MapPin, Beaker, Layers, X } from 'lucide-react';
import { DATE_PRESETS, rangeForPreset } from '../../lib/analyticsConfig';

export default function AnalyticsFilterBar({ filters, onChange, options, hasActive }) {
  const counties = options?.counties || [];
  const pathogens = options?.pathogens || [];
  const sectors = options?.sectors || [];

  const applyPreset = (id) => {
    const r = rangeForPreset(id);
    onChange({ preset: id, start_date: r.start, end_date: r.end });
  };

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-4 space-y-3">
      <div className="flex flex-wrap gap-2">
        {DATE_PRESETS.map((p) => (
          <button
            key={p.id}
            onClick={() => applyPreset(p.id)}
            className={`text-xs px-3 py-1.5 rounded-full border transition ${
              filters.preset === p.id
                ? 'border-[var(--accent-teal)] bg-[var(--accent-teal)]/10 text-[var(--accent-teal)] font-semibold'
                : 'border-[var(--border-primary)] bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
            }`}
          >
            {p.label}
          </button>
        ))}
        <button
          onClick={() => onChange({ preset: 'custom' })}
          className={`text-xs px-3 py-1.5 rounded-full border transition ${
            filters.preset === 'custom'
              ? 'border-[var(--accent-teal)] bg-[var(--accent-teal)]/10 text-[var(--accent-teal)] font-semibold'
              : 'border-[var(--border-primary)] bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
          }`}
        >
          Custom
        </button>
      </div>

      {filters.preset === 'custom' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1">
              <Calendar className="w-3 h-3" /> From
            </span>
            <input
              type="date"
              value={filters.start_date}
              onChange={(e) => onChange({ start_date: e.target.value })}
              className="rounded-[var(--radius-input)] border border-[var(--border-primary)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)]"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1">
              <Calendar className="w-3 h-3" /> To
            </span>
            <input
              type="date"
              value={filters.end_date}
              onChange={(e) => onChange({ end_date: e.target.value })}
              className="rounded-[var(--radius-input)] border border-[var(--border-primary)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)]"
            />
          </label>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1">
            <MapPin className="w-3 h-3" /> County
          </span>
          <select
            value={filters.county}
            onChange={(e) => onChange({ county: e.target.value })}
            className="rounded-[var(--radius-input)] border border-[var(--border-primary)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)]"
          >
            <option value="">All counties</option>
            {counties.map((c) => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1">
            <Beaker className="w-3 h-3" /> Pathogen
          </span>
          <select
            value={filters.pathogen}
            onChange={(e) => onChange({ pathogen: e.target.value })}
            className="rounded-[var(--radius-input)] border border-[var(--border-primary)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)]"
          >
            <option value="">All pathogens</option>
            {pathogens.map((p) => (
              <option key={p.code} value={p.code}>{p.name || p.code}</option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1">
            <Layers className="w-3 h-3" /> Sector
          </span>
          <select
            value={filters.sector}
            onChange={(e) => onChange({ sector: e.target.value })}
            className="rounded-[var(--radius-input)] border border-[var(--border-primary)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)]"
          >
            <option value="">All sectors</option>
            {sectors.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>

      {hasActive && (
        <div className="flex justify-end pt-1">
          <button
            onClick={() => onChange({ county: '', pathogen: '', sector: '', preset: '90d' })}
            className="inline-flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--status-critical)] transition"
          >
            <X className="w-3.5 h-3.5" />
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}

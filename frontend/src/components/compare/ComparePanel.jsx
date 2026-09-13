import { MapPin, Beaker, Layers, Calendar } from 'lucide-react';

export default function ComparePanel({ title, value, onChange, options }) {
  const counties = options?.counties || [];
  const pathogens = options?.pathogens || [];
  const sectors = options?.sectors || [];

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-4 space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
        {title}
      </h3>

      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1">
            <Calendar className="w-3 h-3" /> From
          </span>
          <input
            type="date"
            value={value.start}
            onChange={(e) => onChange({ ...value, start: e.target.value })}
            className="rounded-[var(--radius-input)] border border-[var(--border-primary)] bg-[var(--bg-primary)] px-2 py-1.5 text-xs text-[var(--text-primary)]"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1">
            <Calendar className="w-3 h-3" /> To
          </span>
          <input
            type="date"
            value={value.end}
            onChange={(e) => onChange({ ...value, end: e.target.value })}
            className="rounded-[var(--radius-input)] border border-[var(--border-primary)] bg-[var(--bg-primary)] px-2 py-1.5 text-xs text-[var(--text-primary)]"
          />
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1">
            <MapPin className="w-3 h-3" /> County
          </span>
          <select
            value={value.county || ''}
            onChange={(e) => onChange({ ...value, county: e.target.value })}
            className="rounded-[var(--radius-input)] border border-[var(--border-primary)] bg-[var(--bg-primary)] px-2 py-1.5 text-xs text-[var(--text-primary)]"
          >
            <option value="">All</option>
            {counties.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1">
            <Beaker className="w-3 h-3" /> Pathogen
          </span>
          <select
            value={value.pathogen || ''}
            onChange={(e) => onChange({ ...value, pathogen: e.target.value })}
            className="rounded-[var(--radius-input)] border border-[var(--border-primary)] bg-[var(--bg-primary)] px-2 py-1.5 text-xs text-[var(--text-primary)]"
          >
            <option value="">All</option>
            {pathogens.map((p) => <option key={p.code} value={p.code}>{p.name || p.code}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] flex items-center gap-1">
            <Layers className="w-3 h-3" /> Sector
          </span>
          <select
            value={value.sector || ''}
            onChange={(e) => onChange({ ...value, sector: e.target.value })}
            className="rounded-[var(--radius-input)] border border-[var(--border-primary)] bg-[var(--bg-primary)] px-2 py-1.5 text-xs text-[var(--text-primary)]"
          >
            <option value="">All</option>
            {sectors.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
      </div>
    </div>
  );
}

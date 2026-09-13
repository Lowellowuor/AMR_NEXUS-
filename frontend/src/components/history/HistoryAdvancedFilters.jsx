import { Calendar } from 'lucide-react';
import { getPresetRange, isPresetActive } from '../../lib/historyConfig';

function PresetButton({ label, onClick, active }) {
  return (
    <button
      onClick={onClick}
      className={`text-xs px-3 py-1.5 rounded-full border transition ${
        active
          ? 'border-[var(--accent-teal)] bg-[var(--accent-teal)]/10 text-[var(--accent-teal)] font-semibold'
          : 'border-[var(--border-primary)] bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
      }`}
    >
      {label}
    </button>
  );
}

export default function HistoryAdvancedFilters({ filters, onChange, options }) {
  const applyPreset = (preset) => {
    const range = getPresetRange(preset);
    if (range) onChange({ start_date: range.start, end_date: range.end });
  };

  const counties = options?.counties || [];
  const pathogens = options?.pathogens || [];
  const sectors = options?.sectors || [];

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-4 space-y-3">
      <div className="flex flex-wrap gap-2">
        <PresetButton label="Today" onClick={() => applyPreset('today')} active={isPresetActive(filters, 'today')} />
        <PresetButton label="Last 7 days" onClick={() => applyPreset('7d')} active={isPresetActive(filters, '7d')} />
        <PresetButton label="Last 30 days" onClick={() => applyPreset('30d')} active={isPresetActive(filters, '30d')} />
        <PresetButton label="This month" onClick={() => applyPreset('month')} active={isPresetActive(filters, 'month')} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
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

        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">County</span>
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
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Pathogen</span>
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
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Sector</span>
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
    </div>
  );
}

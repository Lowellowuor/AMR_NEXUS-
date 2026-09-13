import { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';

const PRESETS = [
  { id: '7d', label: '7 days', days: 7 },
  { id: '30d', label: '30 days', days: 30 },
  { id: '90d', label: '90 days', days: 90 },
  { id: 'ytd', label: 'YTD', days: null },
];

function toIso(d) {
  return d.toISOString().slice(0, 10);
}

function resolvePreset(id) {
  const end = new Date();
  const start = new Date();
  if (id === 'ytd') {
    start.setMonth(0);
    start.setDate(1);
  } else {
    const preset = PRESETS.find((p) => p.id === id);
    start.setDate(start.getDate() - ((preset?.days ?? 30) - 1));
  }
  return { start: toIso(start), end: toIso(end) };
}

export default function TimeScopeSelector({ value, onChange }) {
  const [custom, setCustom] = useState(value.preset === 'custom');

  useEffect(() => {
    setCustom(value.preset === 'custom');
  }, [value.preset]);

  const applyPreset = (id) => {
    const r = resolvePreset(id);
    onChange({ preset: id, start_date: r.start, end_date: r.end });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {PRESETS.map((p) => (
        <button
          key={p.id}
          onClick={() => applyPreset(p.id)}
          className={`text-xs px-3 py-1.5 rounded-full border transition ${
            value.preset === p.id
              ? 'border-[var(--accent-teal)] bg-[var(--accent-teal)]/10 text-[var(--accent-teal)] font-semibold'
              : 'border-[var(--border-primary)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
          }`}
        >
          {p.label}
        </button>
      ))}
      <button
        onClick={() => setCustom((v) => !v)}
        className={`text-xs px-3 py-1.5 rounded-full border transition inline-flex items-center gap-1 ${
          value.preset === 'custom'
            ? 'border-[var(--accent-teal)] bg-[var(--accent-teal)]/10 text-[var(--accent-teal)] font-semibold'
            : 'border-[var(--border-primary)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
        }`}
      >
        <Calendar className="w-3 h-3" />
        Custom
      </button>

      {custom && (
        <div className="flex items-center gap-2 ml-2">
          <input
            type="date"
            value={value.start_date}
            onChange={(e) => onChange({ preset: 'custom', start_date: e.target.value })}
            className="rounded-[var(--radius-input)] border border-[var(--border-primary)] bg-[var(--bg-primary)] px-2 py-1.5 text-xs text-[var(--text-primary)]"
          />
          <span className="text-xs text-[var(--text-muted)]">to</span>
          <input
            type="date"
            value={value.end_date}
            onChange={(e) => onChange({ preset: 'custom', end_date: e.target.value })}
            className="rounded-[var(--radius-input)] border border-[var(--border-primary)] bg-[var(--bg-primary)] px-2 py-1.5 text-xs text-[var(--text-primary)]"
          />
        </div>
      )}
    </div>
  );
}

export const PAGE_SIZE = 25;

export const STORAGE_COLUMNS = 'amr-history-columns';
export const STORAGE_DENSITY = 'amr-history-density';

export const SORTABLE = {
  pathogen_code: 'pathogen_code',
  county: 'county',
  mdr_flag: 'mdr_flag',
  mdr_probability: 'mdr_probability',
  anomaly_flag: 'anomaly_flag',
  created_at: 'created_at',
};

export const ALL_COLUMNS = [
  { id: 'pathogen_code', label: 'Pathogen', alwaysOn: true },
  { id: 'county', label: 'County', alwaysOn: true },
  { id: 'mdr_flag', label: 'MDR' },
  { id: 'mdr_probability', label: 'Probability' },
  { id: 'anomaly_flag', label: 'Anomaly' },
  { id: 'created_at', label: 'Date', alwaysOn: true },
];

export function getPresetRange(preset) {
  const today = new Date();
  const iso = (d) => d.toISOString().slice(0, 10);
  const daysAgo = (n) => {
    const d = new Date(today);
    d.setDate(d.getDate() - n);
    return d;
  };
  switch (preset) {
    case 'today': return { start: iso(today), end: iso(today) };
    case '7d': return { start: iso(daysAgo(6)), end: iso(today) };
    case '30d': return { start: iso(daysAgo(29)), end: iso(today) };
    case 'month':
      return {
        start: iso(new Date(today.getFullYear(), today.getMonth(), 1)),
        end: iso(today),
      };
    default: return null;
  }
}

export function isPresetActive(filters, preset) {
  const range = getPresetRange(preset);
  if (!range) return false;
  return filters.start_date === range.start && filters.end_date === range.end;
}

export function loadColumnPrefs() {
  try {
    const raw = localStorage.getItem(STORAGE_COLUMNS);
    if (raw) {
      const parsed = JSON.parse(raw);
      const known = new Set(ALL_COLUMNS.map((c) => c.id));
      return Object.fromEntries(
        Object.entries(parsed).filter(([k]) => known.has(k)),
      );
    }
  } catch {}
  return Object.fromEntries(ALL_COLUMNS.map((c) => [c.id, true]));
}

export function loadDensity() {
  const v = localStorage.getItem(STORAGE_DENSITY);
  return v === 'compact' ? 'compact' : 'comfortable';
}

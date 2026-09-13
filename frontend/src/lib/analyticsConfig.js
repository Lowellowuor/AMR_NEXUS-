export const ANALYTICS_TABS = [
  { id: 'summary', label: 'Summary' },
  { id: 'trends', label: 'Trends' },
  { id: 'pathogens', label: 'Pathogens' },
  { id: 'sectors', label: 'Sectors' },
  { id: 'geography', label: 'Geography' },
];

export const DATE_PRESETS = [
  { id: '7d', label: 'Last 7 days', days: 7 },
  { id: '30d', label: 'Last 30 days', days: 30 },
  { id: '90d', label: 'Last 90 days', days: 90 },
  { id: '12m', label: 'Last 12 months', days: 365 },
];

export function rangeForPreset(id, customStart, customEnd) {
  if (id === 'custom') return { start: customStart, end: customEnd };
  const found = DATE_PRESETS.find((p) => p.id === id);
  const days = found?.days ?? 30;
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

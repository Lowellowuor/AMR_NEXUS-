export const STORAGE_ALERTS_DENSITY = 'amr-alerts-density';

export const SEVERITY_META = {
  critical: { label: 'Critical', tone: 'critical', order: 0 },
  high: { label: 'High', tone: 'warning', order: 1 },
  medium: { label: 'Medium', tone: 'info', order: 2 },
  low: { label: 'Low', tone: 'neutral', order: 3 },
};

export const STATUS_TABS = [
  { id: 'unacknowledged', label: 'Unacknowledged' },
  { id: 'acknowledged', label: 'Acknowledged' },
  { id: 'resolved', label: 'Resolved' },
  { id: 'all', label: 'All' },
];

export function loadDensity() {
  const v = localStorage.getItem(STORAGE_ALERTS_DENSITY);
  return v === 'compact' ? 'compact' : 'comfortable';
}

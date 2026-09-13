export const COMPARE_MODES = [
  { id: 'periods', label: 'Compare periods' },
  { id: 'records', label: 'Compare records' },
];

export function defaultRange(offsetWeeks = 0) {
  const end = new Date();
  end.setDate(end.getDate() - offsetWeeks * 7);
  const start = new Date(end);
  start.setDate(start.getDate() - 90);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

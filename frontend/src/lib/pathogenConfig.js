export const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'resistance', label: 'Resistance' },
  { id: 'geography', label: 'Geography' },
  { id: 'trends', label: 'Trends' },
  { id: 'recent', label: 'Recent' },
];

export const AWARE_ACCESS = [
  'amoxicillin', 'ampicillin', 'benzylpenicillin', 'cefalexin', 'cefazolin',
  'chloramphenicol', 'clindamycin', 'doxycycline', 'gentamicin', 'metronidazole',
  'nitrofurantoin', 'trimethoprim', 'sulfamethoxazole',
];
export const AWARE_WATCH = [
  'azithromycin', 'cefixime', 'cefotaxime', 'ceftriaxone', 'cefuroxime',
  'ciprofloxacin', 'clarithromycin', 'erythromycin', 'levofloxacin',
  'meropenem', 'imipenem', 'piperacillin', 'tazobactam', 'vancomycin',
];
export const AWARE_RESERVE = [
  'colistin', 'polymyxin', 'linezolid', 'daptomycin', 'tigecycline',
  'ceftazidime', 'avibactam', 'fosfomycin',
];

export function classifyAntibiotic(name) {
  if (!name) return null;
  const v = name.toLowerCase();
  if (AWARE_RESERVE.some((k) => v.includes(k))) return { label: 'Reserve', tone: 'critical' };
  if (AWARE_WATCH.some((k) => v.includes(k))) return { label: 'Watch', tone: 'warning' };
  if (AWARE_ACCESS.some((k) => v.includes(k))) return { label: 'Access', tone: 'success' };
  return null;
}

export function toneForRate(rate) {
  if (rate >= 60) return 'critical';
  if (rate >= 30) return 'warning';
  return 'success';
}

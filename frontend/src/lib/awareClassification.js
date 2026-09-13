const ACCESS = [
  'amoxicillin', 'ampicillin', 'benzylpenicillin', 'cefalexin', 'cefazolin',
  'chloramphenicol', 'clindamycin', 'doxycycline', 'gentamicin', 'metronidazole',
  'nitrofurantoin', 'trimethoprim', 'sulfamethoxazole',
];

const WATCH = [
  'azithromycin', 'cefixime', 'cefotaxime', 'ceftriaxone', 'cefuroxime',
  'ciprofloxacin', 'clarithromycin', 'erythromycin', 'levofloxacin',
  'meropenem', 'imipenem', 'piperacillin', 'tazobactam', 'vancomycin',
];

const RESERVE = [
  'colistin', 'polymyxin', 'linezolid', 'daptomycin', 'tigecycline',
  'ceftazidime', 'avibactam', 'fosfomycin',
];

const CATEGORY = {
  access: { label: 'Access', tone: 'success', description: 'First-line agents. Use freely when indicated.' },
  watch: { label: 'Watch', tone: 'warning', description: 'Use when Access agents are ineffective. Monitor closely.' },
  reserve: { label: 'Reserve', tone: 'critical', description: 'Last-resort agents. Preserve for confirmed resistant infections.' },
};

export function classifyAntibiotic(name) {
  if (!name) return null;
  const lower = name.toLowerCase();
  if (RESERVE.some((k) => lower.includes(k))) return { id: 'reserve', ...CATEGORY.reserve };
  if (WATCH.some((k) => lower.includes(k))) return { id: 'watch', ...CATEGORY.watch };
  if (ACCESS.some((k) => lower.includes(k))) return { id: 'access', ...CATEGORY.access };
  return null;
}

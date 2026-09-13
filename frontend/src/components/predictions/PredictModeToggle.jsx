import { Beaker, Upload } from 'lucide-react';

export default function PredictModeToggle({ mode, onChange }) {
  const tabs = [
    { id: 'single', label: 'Single prediction', icon: Beaker },
    { id: 'batch', label: 'Batch upload', icon: Upload },
  ];

  return (
    <div className="inline-flex rounded-full border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-1">
      {tabs.map(({ id, label, icon: Icon }) => {
        const active = mode === id;
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition ${
              active
                ? 'bg-[var(--accent-teal)] text-white'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        );
      })}
    </div>
  );
}

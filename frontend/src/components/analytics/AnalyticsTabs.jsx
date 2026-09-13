import { ANALYTICS_TABS } from '../../lib/analyticsConfig';

export default function AnalyticsTabs({ active, onChange }) {
  return (
    <div className="border-b border-[var(--border-primary)]">
      <nav className="flex gap-1 overflow-x-auto -mb-px">
        {ANALYTICS_TABS.map((t) => {
          const isActive = active === t.id;
          return (
            <button
              key={t.id}
              onClick={() => onChange(t.id)}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition border-b-2 ${
                isActive
                  ? 'border-[var(--accent-teal)] text-[var(--accent-teal)]'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-secondary)]'
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

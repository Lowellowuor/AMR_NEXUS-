import { TABS } from '../../lib/pathogenConfig';

export default function PathogenTabs({ active, onChange, counts = {} }) {
  return (
    <div className="border-b border-[var(--border-primary)]">
      <nav className="flex gap-1 overflow-x-auto -mb-px">
        {TABS.map((tab) => {
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition border-b-2 ${
                isActive
                  ? 'border-[var(--accent-teal)] text-[var(--accent-teal)]'
                  : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-secondary)]'
              }`}
            >
              {tab.label}
              {counts[tab.id] != null && (
                <span className="ml-1.5 text-xs text-[var(--text-muted)] tabular-nums">{counts[tab.id]}</span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

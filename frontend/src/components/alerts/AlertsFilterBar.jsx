import { Search, X, Filter, AlignJustify, AlignVerticalSpaceAround } from 'lucide-react';
import { STATUS_TABS } from '../../lib/alertsConfig';

export default function AlertsFilterBar({
  filters,
  onChange,
  searchInput,
  onSearchChange,
  searchRef,
  showAdvanced,
  onToggleAdvanced,
  hasActiveFilters,
  onReset,
  density,
  onDensityChange,
}) {
  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-4 space-y-3">
      {/* Status tabs */}
      <div className="flex flex-wrap gap-2 pb-3 border-b border-[var(--border-primary)]">
        {STATUS_TABS.map((tab) => {
          const active = filters.status === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChange({ status: tab.id })}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                active
                  ? 'bg-[var(--accent-teal)] text-white'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input
            ref={searchRef}
            type="text"
            placeholder="Search pathogen, county…"
            value={searchInput}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full rounded-[var(--radius-input)] border border-[var(--border-primary)] bg-[var(--bg-primary)] pl-9 pr-9 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-teal)]"
          />
          {searchInput && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <select
          value={filters.severity}
          onChange={(e) => onChange({ severity: e.target.value })}
          className="rounded-[var(--radius-input)] border border-[var(--border-primary)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)]"
        >
          <option value="all">All severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        <select
          value={filters.type}
          onChange={(e) => onChange({ type: e.target.value })}
          className="rounded-[var(--radius-input)] border border-[var(--border-primary)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)]"
        >
          <option value="all">All types</option>
          <option value="anomaly">Anomaly</option>
          <option value="high_mdr">High MDR</option>
        </select>

        <button
          onClick={onToggleAdvanced}
          className={`inline-flex items-center gap-2 px-3 py-2 rounded-[var(--radius-input)] border text-sm font-medium transition ${
            showAdvanced
              ? 'border-[var(--accent-teal)] bg-[var(--accent-teal)]/10 text-[var(--accent-teal)]'
              : 'border-[var(--border-primary)] bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
          }`}
        >
          <Filter className="w-4 h-4" />
          Advanced
          {hasActiveFilters && (
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--accent-teal)]" />
          )}
        </button>

        <div className="flex rounded-[var(--radius-input)] border border-[var(--border-primary)] overflow-hidden">
          <button
            onClick={() => onDensityChange('comfortable')}
            className={`px-2.5 py-2 transition ${
              density === 'comfortable'
                ? 'bg-[var(--accent-teal)] text-white'
                : 'bg-[var(--bg-primary)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
            title="Comfortable"
          >
            <AlignVerticalSpaceAround className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDensityChange('compact')}
            className={`px-2.5 py-2 transition ${
              density === 'compact'
                ? 'bg-[var(--accent-teal)] text-white'
                : 'bg-[var(--bg-primary)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
            title="Compact"
          >
            <AlignJustify className="w-4 h-4" />
          </button>
        </div>

        {hasActiveFilters && (
          <button
            onClick={onReset}
            className="text-sm text-[var(--text-muted)] hover:text-[var(--status-critical)] transition"
          >
            Reset
          </button>
        )}
      </div>
    </div>
  );
}

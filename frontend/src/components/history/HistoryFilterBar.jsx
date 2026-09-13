import { useState } from 'react';
import { Search, X, Filter, Columns3, AlignJustify, AlignVerticalSpaceAround } from 'lucide-react';
import { ALL_COLUMNS } from '../../lib/historyConfig';

export default function HistoryFilterBar({
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
  columnPrefs,
  onColumnPrefsChange,
}) {
  const [showColumnPicker, setShowColumnPicker] = useState(false);

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-4">
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input
            ref={searchRef}
            type="text"
            placeholder="Search pathogen, county, sub-county… (/)"
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
          value={filters.mdr}
          onChange={(e) => onChange({ mdr: e.target.value })}
          className="rounded-[var(--radius-input)] border border-[var(--border-primary)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)]"
        >
          <option value="all">All MDR</option>
          <option value="true">MDR only</option>
          <option value="false">Non-MDR</option>
        </select>

        <select
          value={filters.anomaly}
          onChange={(e) => onChange({ anomaly: e.target.value })}
          className="rounded-[var(--radius-input)] border border-[var(--border-primary)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)]"
        >
          <option value="all">All anomaly</option>
          <option value="true">Flagged</option>
          <option value="false">Normal</option>
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

        <div className="relative">
          <button
            onClick={() => setShowColumnPicker((v) => !v)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-[var(--radius-input)] border border-[var(--border-primary)] bg-[var(--bg-primary)] text-[var(--text-secondary)] text-sm font-medium hover:bg-[var(--bg-tertiary)]"
          >
            <Columns3 className="w-4 h-4" />
            Columns
          </button>
          {showColumnPicker && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setShowColumnPicker(false)} />
              <div className="absolute right-0 mt-2 w-56 rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] shadow-lg z-30 p-2">
                {ALL_COLUMNS.map((col) => (
                  <label
                    key={col.id}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[var(--bg-tertiary)] cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={!!columnPrefs[col.id]}
                      disabled={col.alwaysOn}
                      onChange={(e) =>
                        onColumnPrefsChange({ ...columnPrefs, [col.id]: e.target.checked })
                      }
                      className="rounded border-[var(--border-secondary)]"
                    />
                    <span className="text-sm text-[var(--text-secondary)]">
                      {col.label}
                      {col.alwaysOn && (
                        <span className="text-[10px] text-[var(--text-muted)] ml-1">(locked)</span>
                      )}
                    </span>
                  </label>
                ))}
              </div>
            </>
          )}
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

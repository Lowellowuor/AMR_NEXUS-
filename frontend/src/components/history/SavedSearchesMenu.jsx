import { useState, useRef, useEffect } from 'react';
import { Bookmark, Trash2, Save, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useSavedSearches } from '../../hooks/useSavedSearches';

export default function SavedSearchesMenu({ currentFilters, onApply, hasActiveFilters }) {
  const [open, setOpen] = useState(false);
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState('');
  const { searches, save, remove } = useSavedSearches();
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleSave = () => {
    if (!name.trim()) {
      toast.error('Name required');
      return;
    }
    const entry = save(name, currentFilters);
    if (entry) {
      toast.success(`Saved "${entry.name}"`);
      setName('');
      setNaming(false);
      setOpen(false);
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[var(--radius-btn)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] text-sm font-medium hover:bg-[var(--bg-tertiary)] transition"
      >
        <Bookmark className="w-4 h-4" />
        Saved
        {searches.length > 0 && (
          <span className="ml-1 text-xs px-1.5 rounded-full bg-[var(--accent-teal)]/15 text-[var(--accent-teal)] tabular-nums">
            {searches.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-72 rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] shadow-lg z-30 overflow-hidden">
          {naming ? (
            <div className="p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Save className="w-4 h-4 text-[var(--text-muted)]" />
                <span className="text-xs font-medium text-[var(--text-primary)]">
                  Save current filters
                </span>
                <button
                  onClick={() => {
                    setNaming(false);
                    setName('');
                  }}
                  className="ml-auto p-1 rounded text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSave();
                  if (e.key === 'Escape') {
                    setNaming(false);
                    setName('');
                  }
                }}
                placeholder="e.g. Nairobi MDR blood"
                className="w-full px-2 py-1.5 text-xs rounded-lg bg-[var(--bg-primary)] border border-[var(--border-primary)]/40 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-teal)]"
              />
              <button
                onClick={handleSave}
                className="w-full px-3 py-1.5 rounded-lg text-xs bg-[var(--accent-teal)] text-white hover:opacity-90"
              >
                Save
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={() => setNaming(true)}
                disabled={!hasActiveFilters}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] border-b border-[var(--border-primary)]/40 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-3.5 h-3.5" />
                Save current filters
                {!hasActiveFilters && (
                  <span className="ml-auto text-[10px] text-[var(--text-muted)]">
                    no filters
                  </span>
                )}
              </button>

              {searches.length === 0 ? (
                <p className="px-3 py-4 text-xs text-[var(--text-muted)] text-center">
                  No saved searches yet
                </p>
              ) : (
                <ul className="max-h-72 overflow-y-auto">
                  {searches.map((s) => (
                    <li
                      key={s.id}
                      className="flex items-center group border-b border-[var(--border-primary)]/30 last:border-b-0"
                    >
                      <button
                        onClick={() => {
                          onApply(s.filters);
                          setOpen(false);
                        }}
                        className="flex-1 text-left px-3 py-2 hover:bg-[var(--bg-tertiary)]"
                      >
                        <p className="text-xs font-medium text-[var(--text-primary)] truncate">
                          {s.name}
                        </p>
                        <p className="text-[10px] text-[var(--text-muted)]">
                          {new Date(s.savedAt).toLocaleDateString()}
                        </p>
                      </button>
                      <button
                        onClick={() => remove(s.id)}
                        className="p-2 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 hover:text-[var(--status-critical)] transition"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
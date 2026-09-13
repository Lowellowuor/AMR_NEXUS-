import { useState } from 'react';
import { RefreshCw, Download } from 'lucide-react';

export default function HistoryPageHeader({ onRefresh, isFetching, onExportCSV, onExportJSON }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-wrap justify-between items-center gap-3">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Prediction History</h1>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">
          Browse, filter, and export all recorded isolates
        </p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onRefresh}
          disabled={isFetching}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-btn)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] text-sm font-medium hover:bg-[var(--bg-tertiary)] transition disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </button>

        <div className="relative">
          <button
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-btn)] bg-[var(--accent-teal)] hover:bg-[var(--accent-teal-hover)] text-white text-sm font-medium transition"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          {open && (
            <>
              <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
              <div className="absolute right-0 mt-2 w-44 rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] shadow-lg z-30 py-1">
                <button
                  onClick={() => { setOpen(false); onExportCSV(); }}
                  className="w-full text-left px-4 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
                >
                  Download CSV (all)
                </button>
                <button
                  onClick={() => { setOpen(false); onExportJSON(); }}
                  className="w-full text-left px-4 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
                >
                  Download JSON (page)
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

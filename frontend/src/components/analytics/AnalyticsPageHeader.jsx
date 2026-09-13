import { RefreshCw, Download } from 'lucide-react';

export default function AnalyticsPageHeader({ isFetching, onRefresh, onExport }) {
  return (
    <div className="flex flex-wrap justify-between items-center gap-3">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Analytics</h1>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">
          Population-level resistance, trends, and geographic distribution
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
        <button
          onClick={onExport}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-btn)] bg-[var(--accent-teal)] hover:bg-[var(--accent-teal-hover)] text-white text-sm font-medium transition"
        >
          <Download className="w-4 h-4" />
          Export
        </button>
      </div>
    </div>
  );
}

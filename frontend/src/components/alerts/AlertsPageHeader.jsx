import { RefreshCw, Download } from 'lucide-react';

export default function AlertsPageHeader({ onRefresh, isFetching, onExport, alertCount }) {
  return (
    <div className="flex flex-wrap justify-between items-center gap-3">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Stewardship Alerts</h1>
        <p className="text-sm text-[var(--text-muted)] mt-0.5">
          {alertCount != null
            ? `${alertCount} alert${alertCount === 1 ? '' : 's'} matching current filters`
            : 'Early warning triage and resolution'}
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
          Export CSV
        </button>
      </div>
    </div>
  );
}

import { Download, RefreshCw } from 'lucide-react';
import { formatNumber, formatPercent } from '../../lib/format';
import { toneForRate } from '../../lib/pathogenConfig';

export default function PathogenPageHeader({ summary, pathogen, isFetching, onRefresh, onExport }) {
  if (!summary) {
    return (
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Pathogen Explorer</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            Deep-dive analysis by pathogen across time, geography, and antibiotic class
          </p>
        </div>
      </div>
    );
  }

  const tone = toneForRate(summary.mdr_rate);
  const toneClass = {
    critical: 'text-[var(--status-critical)]',
    warning: 'text-[var(--status-warning)]',
    success: 'text-[var(--status-success)]',
  }[tone];

  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl font-bold text-[var(--text-primary)] truncate">{pathogen}</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span>
            <strong className="text-[var(--text-primary)] tabular-nums">{formatNumber(summary.samples)}</strong> samples
          </span>
          <span>·</span>
          <span>
            MDR <strong className={`tabular-nums ${toneClass}`}>{formatPercent(summary.mdr_rate)}</strong>{' '}
            <span className="text-[var(--text-muted)]">(95% CI {summary.ci_low}–{summary.ci_high}%)</span>
          </span>
          {summary.change != null && (
            <>
              <span>·</span>
              <span className={summary.change > 0 ? 'text-[var(--status-critical)] font-semibold' : summary.change < 0 ? 'text-[var(--status-success)] font-semibold' : 'text-[var(--text-muted)]'}>
                {summary.change > 0 ? '+' : ''}{summary.change} pts vs previous
              </span>
            </>
          )}
        </p>
      </div>
      <div className="flex gap-2 flex-shrink-0">
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

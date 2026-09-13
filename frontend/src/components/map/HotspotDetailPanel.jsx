import { X, Building2, MapPin, TrendingUp } from 'lucide-react';

const rateTone = (rate) => {
  if (rate >= 60) return 'text-[var(--status-critical)]';
  if (rate >= 30) return 'text-[var(--status-warning)]';
  return 'text-[var(--status-success)]';
};

export default function HotspotDetailPanel({ hotspot, onClose }) {
  if (!hotspot) return null;

  const rate = hotspot.resistance_rate ?? 0;

  return (
    <>
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm z-[900]"
        onClick={onClose}
      />
      <aside className="absolute top-0 right-0 h-full w-full sm:w-96 bg-[var(--bg-secondary)] border-l border-[var(--border-primary)] shadow-2xl z-[1000] flex flex-col">
        <header className="flex items-start justify-between gap-3 px-5 py-4 border-b border-[var(--border-primary)] bg-[var(--bg-secondary)]">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[var(--accent-teal)]/10 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-5 h-5 text-[var(--accent-teal)]" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-[var(--text-primary)] truncate">
                {hotspot.name}
              </h2>
              <p className="text-xs text-[var(--text-muted)] capitalize">{hotspot.type}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition flex-shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <section className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-tertiary)]/40 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Overall MDR Rate
            </p>
            <p className={`text-3xl font-bold mt-1 ${rateTone(rate)}`}>
              {rate.toFixed(1)}%
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Based on {hotspot.total_samples ?? 0} samples
            </p>
          </section>

          <section className="rounded-[var(--radius-card)] border border-[var(--border-primary)] p-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              Location
            </p>
            <div className="flex items-start gap-2 text-sm text-[var(--text-primary)]">
              <MapPin className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0 mt-0.5" />
              <div>
                <p>
                  {hotspot.county}
                  {hotspot.sub_county ? `, ${hotspot.sub_county}` : ''}
                </p>
                {hotspot.address && (
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">{hotspot.address}</p>
                )}
                {hotspot.contact && (
                  <p className="text-xs text-[var(--text-muted)]">Contact: {hotspot.contact}</p>
                )}
              </div>
            </div>
          </section>

          {hotspot.pathogen_breakdown?.length > 0 && (
            <section className="rounded-[var(--radius-card)] border border-[var(--border-primary)] p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] flex items-center gap-1.5 mb-3">
                <TrendingUp className="w-3.5 h-3.5" />
                Pathogen Breakdown
              </h3>
              <ul className="space-y-2">
                {hotspot.pathogen_breakdown.map((p, idx) => {
                  const r = Number(p.rate ?? 0);
                  const barColor =
                    r >= 60 ? 'var(--status-critical)'
                    : r >= 30 ? 'var(--status-warning)'
                    : 'var(--status-success)';
                  return (
                    <li key={idx} className="space-y-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-sm text-[var(--text-primary)] truncate">
                          {p.pathogen}
                        </span>
                        <span className="text-sm font-semibold text-[var(--text-primary)] tabular-nums">
                          {r.toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${Math.min(r, 100)}%`, background: barColor }}
                        />
                      </div>
                      <p className="text-[10px] text-[var(--text-muted)]">
                        {p.count} sample{p.count === 1 ? '' : 's'}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>
      </aside>
    </>
  );
}

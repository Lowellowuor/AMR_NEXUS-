import { X, MapPin, AlertTriangle } from 'lucide-react';

const rateTone = (rate) => {
  if (rate >= 60) return 'text-[var(--status-critical)]';
  if (rate >= 30) return 'text-[var(--status-warning)]';
  return 'text-[var(--status-success)]';
};

export default function CountyDetailPanel({ county, alerts = [], onClose }) {
  if (!county) return null;

  const countyAlerts = alerts.filter((a) => a.county === county.county);
  const rateValue = county.mdr_rate != null ? county.mdr_rate * 100 : null;
  const rate = rateValue != null ? rateValue.toFixed(1) : '--';
  const change = county.change != null ? Number(county.change).toFixed(2) : null;

  return (
    <>
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm z-[900]"
        onClick={onClose}
      />
      <aside className="absolute top-0 right-0 h-full w-full sm:w-96 bg-[var(--bg-secondary)] border-l border-[var(--border-primary)] shadow-2xl z-[1000] flex flex-col">
        <header className="flex items-start justify-between gap-3 px-5 py-4 border-b border-[var(--border-primary)]">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[var(--accent-teal)]/10 flex items-center justify-center flex-shrink-0">
              <MapPin className="w-5 h-5 text-[var(--accent-teal)]" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-[var(--text-primary)] truncate">
                {county.sub_county || county.county}
              </h2>
              <p className="text-xs text-[var(--text-muted)]">{county.county}</p>
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
              MDR Rate
            </p>
            <p className={`text-3xl font-bold mt-1 ${rateValue != null ? rateTone(rateValue) : 'text-[var(--text-primary)]'}`}>
              {rate}%
            </p>
            {change !== null && (
              <p className="text-xs mt-1">
                <span className="text-[var(--text-muted)]">Change: </span>
                <span
                  className={
                    Number(change) > 0
                      ? 'text-[var(--status-critical)] font-semibold'
                      : Number(change) < 0
                        ? 'text-[var(--status-success)] font-semibold'
                        : 'text-[var(--text-muted)]'
                  }
                >
                  {Number(change) > 0 ? '+' : ''}
                  {change}
                </span>
              </p>
            )}
          </section>

          {countyAlerts.length > 0 && (
            <section className="rounded-[var(--radius-card)] border border-[var(--border-primary)] p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)] flex items-center gap-1.5 mb-3">
                <AlertTriangle className="w-3.5 h-3.5 text-[var(--status-critical)]" />
                Active Alerts ({countyAlerts.length})
              </h3>
              <ul className="space-y-2">
                {countyAlerts.map((alert) => (
                  <li
                    key={alert.id}
                    className="rounded-lg p-3 border-l-4 border-l-[var(--status-critical)] bg-[var(--status-critical-bg)]"
                  >
                    <p className="text-sm font-semibold text-[var(--text-primary)]">
                      {alert.pathogen}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">{alert.summary}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </aside>
    </>
  );
}

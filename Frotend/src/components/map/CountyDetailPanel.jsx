import { X, MapPin, AlertTriangle, TrendingUp } from 'lucide-react';

export default function CountyDetailPanel({ county, alerts = [], onClose }) {
  if (!county) return null;

  const countyAlerts = alerts.filter(a => a.county === county.county);
  const rate = county.mdr_rate != null ? (county.mdr_rate * 100).toFixed(1) : '--';
  const change = county.change != null ? county.change.toFixed(2) : null;

  return (
    <>
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm z-[999]"
        onClick={onClose}
      />
      <div className="absolute top-0 right-0 h-full w-80 bg-[var(--bg-secondary)] border-l border-[var(--border-primary)] shadow-2xl z-[1000] overflow-y-auto">
        <div className="sticky top-0 bg-[var(--bg-secondary)] p-4 border-b border-[var(--border-primary)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[var(--accent-cyan)]" />
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">
                {county.sub_county || county.county}
              </h2>
              <p className="text-xs text-[var(--text-muted)]">{county.county}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="card p-4">
            <span className="section-label">MDR Rate</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="data-number text-2xl">{rate}%</span>
            </div>
            {change !== null && (
              <div className="mt-1 text-xs">
                <span className="font-semibold text-[var(--text-secondary)]">Change:</span>{' '}
                <span className={change > 0 ? 'text-red-500' : change < 0 ? 'text-emerald-500' : 'text-[var(--text-muted)]'}>
                  {change > 0 ? '+' : ''}{change}
                </span>
              </div>
            )}
          </div>

          {countyAlerts.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-[var(--accent-red)]" />
                Active Alerts ({countyAlerts.length})
              </h3>
              <div className="mt-2 space-y-2">
                {countyAlerts.map(alert => (
                  <div key={alert.id} className="p-3 rounded-lg bg-red-500/5 border border-red-500/10">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{alert.pathogen}</p>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">{alert.summary}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
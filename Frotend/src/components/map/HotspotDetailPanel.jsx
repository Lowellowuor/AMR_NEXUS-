import { X, Building2, MapPin, TrendingUp } from 'lucide-react';

export default function HotspotDetailPanel({ hotspot, onClose }) {
  if (!hotspot) return null;

  return (
    <>
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm z-[999]"
        onClick={onClose}
      />
      <div className="absolute top-0 right-0 h-full w-80 bg-[var(--bg-secondary)] border-l border-[var(--border-primary)] shadow-2xl z-[1000] overflow-y-auto">
        <div className="sticky top-0 bg-[var(--bg-secondary)] p-4 border-b border-[var(--border-primary)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[var(--accent-cyan)]" />
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">
                {hotspot.name}
              </h2>
              <p className="text-xs text-[var(--text-muted)]">{hotspot.type}</p>
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
            <span className="section-label">Overall MDR Rate</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="data-number text-2xl">
                {hotspot.resistance_rate?.toFixed(1) || '--'}%
              </span>
            </div>
          </div>

          <div className="card p-4">
            <span className="section-label">Location</span>
            <p className="text-sm mt-1 text-[var(--text-secondary)]">
              <MapPin className="inline w-4 h-4 mr-1" />
              {hotspot.county}
              {hotspot.sub_county ? `, ${hotspot.sub_county}` : ''}
            </p>
            {hotspot.address && (
              <p className="text-xs text-[var(--text-muted)] mt-1">
                {hotspot.address}
              </p>
            )}
            {hotspot.contact && (
              <p className="text-xs text-[var(--text-muted)]">
                Contact: {hotspot.contact}
              </p>
            )}
          </div>

          {hotspot.pathogen_breakdown && hotspot.pathogen_breakdown.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-[var(--accent-cyan)]" />
                Pathogen Breakdown
              </h3>
              <div className="mt-2 space-y-2">
                {hotspot.pathogen_breakdown.map((p, idx) => (
                  <div key={idx} className="p-3 rounded-lg bg-[var(--bg-tertiary)]/50">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-[var(--text-primary)]">
                        {p.pathogen}
                      </span>
                      <span className="text-sm font-bold text-[var(--text-primary)]">
                        {p.rate.toFixed(1)}%
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-muted)]">
                      Samples: {p.count}
                    </p>
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
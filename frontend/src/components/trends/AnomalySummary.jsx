import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Activity, ChevronRight, TrendingUp, MapPin, Beaker } from 'lucide-react';

function Bar({ label, value, max, tone = 'teal' }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  const toneClass = {
    teal: 'bg-[var(--accent-teal)]',
    warning: 'bg-[var(--status-warning)]',
    critical: 'bg-[var(--status-critical)]',
  }[tone];

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-[var(--text-secondary)] truncate pr-2">{label}</span>
        <span className="text-xs font-semibold tabular-nums text-[var(--text-primary)] flex-shrink-0">
          {value}
        </span>
      </div>
      <div className="w-full h-1.5 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
        <div
          className={`h-full rounded-full ${toneClass} transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function AnomalySummary({ anomalies = [], onAnomalyClick }) {
  const stats = useMemo(() => {
    const total = anomalies.length;
    const last24h = anomalies.filter((a) => {
      if (!a.timestamp) return false;
      return Date.now() - new Date(a.timestamp).getTime() < 86400000;
    }).length;

    const byCounty = {};
    const byPathogen = {};
    for (const a of anomalies) {
      if (a.county) byCounty[a.county] = (byCounty[a.county] || 0) + 1;
      if (a.pathogen_code) byPathogen[a.pathogen_code] = (byPathogen[a.pathogen_code] || 0) + 1;
    }

    const topCounties = Object.entries(byCounty)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 4);

    const topPathogens = Object.entries(byPathogen)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 4);

    return { total, last24h, topCounties, topPathogens };
  }, [anomalies]);

  const maxCounty = Math.max(...stats.topCounties.map(([, n]) => n), 1);
  const maxPathogen = Math.max(...stats.topPathogens.map(([, n]) => n), 1);

  return (
    <section
      aria-label="Anomaly summary"
      className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] overflow-hidden"
    >
      <header className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-primary)]">
        <div className="flex items-center gap-2 min-w-0">
          <Activity className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] truncate">
            Anomalies
          </h3>
        </div>
        <Link
          to="/alerts?type=anomaly"
          className="inline-flex items-center gap-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--accent-teal)] hover:opacity-80 transition flex-shrink-0"
        >
          View all
          <ChevronRight className="w-3 h-3" />
        </Link>
      </header>

      {stats.total === 0 ? (
        <div className="px-4 py-8 text-center">
          <p className="text-sm text-[var(--text-muted)]">No anomalies detected</p>
        </div>
      ) : (
        <div className="p-4 space-y-5">
          {/* KPI row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-tertiary)]/40 px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Total
              </p>
              <p className="text-xl font-bold tabular-nums text-[var(--text-primary)] mt-0.5">
                {stats.total}
              </p>
            </div>
            <div className="rounded-lg border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--status-warning)] flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                Last 24h
              </p>
              <p className="text-xl font-bold tabular-nums text-[var(--status-warning)] mt-0.5">
                {stats.last24h}
              </p>
            </div>
          </div>

          {/* Top counties */}
          {stats.topCounties.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                Top counties
              </p>
              <div className="space-y-2.5">
                {stats.topCounties.map(([county, n]) => (
                  <Bar key={county} label={county} value={n} max={maxCounty} tone="warning" />
                ))}
              </div>
            </div>
          )}

          {/* Top pathogens */}
          {stats.topPathogens.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2 flex items-center gap-1">
                <Beaker className="w-3 h-3" />
                Top pathogens
              </p>
              <div className="space-y-2.5">
                {stats.topPathogens.map(([pathogen, n]) => (
                  <Bar key={pathogen} label={pathogen} value={n} max={maxPathogen} tone="teal" />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

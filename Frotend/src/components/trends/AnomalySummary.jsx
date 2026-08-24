import { AlertTriangle, MapPin, TrendingUp, ChevronRight } from 'lucide-react';
import { formatTimeAgo, getRiskLabel } from '../../lib/utils';

export default function AnomalySummary({ anomalies = [], onAnomalyClick }) {
  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--border-primary)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-red-500/10 flex items-center justify-center">
            <TrendingUp className="w-3.5 h-3.5 text-[var(--accent-red)]" />
          </div>
          <span className="section-label">Anomaly Summary</span>
        </div>
        <span className="pill pill-red text-[10px]">{anomalies.length} active</span>
      </div>

      {/* List */}
      <div className="divide-y divide-[var(--border-primary)] max-h-[400px] overflow-y-auto">
        {anomalies.length === 0 ? (
          <div className="p-6 text-center">
            <div className="w-10 h-10 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center mx-auto mb-2">
              <TrendingUp className="w-5 h-5 text-[var(--text-muted)]" />
            </div>
            <p className="text-sm text-[var(--text-muted)]">No anomalies detected</p>
          </div>
        ) : (
          anomalies.map((anomaly) => {
            const severity = getRiskLabel(anomaly.riskScore);
            const isCritical = anomaly.riskScore >= 90;
            const isHigh = anomaly.riskScore >= 75 && anomaly.riskScore < 90;

            return (
              <button
                key={anomaly.id}
                onClick={() => onAnomalyClick?.(anomaly)}
                className="w-full text-left p-3.5 hover:bg-[var(--bg-tertiary)] transition-colors group"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[12px] font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-cyan)] transition-colors">
                    {anomaly.pathogen}
                  </span>
                  <span className={`pill text-[10px] ${isCritical ? 'pill-red' : isHigh ? 'pill-red' : 'pill-cyan'}`}>
                    {severity} · {anomaly.riskScore}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-[10px] text-[var(--text-muted)] mb-1">
                  <span className="font-medium text-[var(--text-secondary)]">
                    {anomaly.drug}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-2.5 h-2.5" />
                    {anomaly.county}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-[10px]">
                    <span className="flex items-center gap-1 text-[var(--accent-red)] font-medium">
                      <TrendingUp className="w-2.5 h-2.5" />
                      Rising
                    </span>
                    <span className="text-[var(--text-muted)]">
                      {formatTimeAgo(anomaly.triggeredAt)}
                    </span>
                  </div>
                  <ChevronRight className="w-3 h-3 text-[var(--text-muted)] group-hover:text-[var(--accent-cyan)] transition-colors" />
                </div>

                {/* Risk bar */}
                <div className="mt-2 h-1 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isCritical ? 'bg-[var(--accent-red)]' : isHigh ? 'bg-orange-500' : 'bg-[var(--accent-cyan)]'
                    }`}
                    style={{ width: `${anomaly.riskScore}%` }}
                  />
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
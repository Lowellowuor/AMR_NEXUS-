import { AlertTriangle, MapPin, TrendingUp, ChevronRight } from 'lucide-react';
import { formatTimeAgo, getRiskLabel } from '../../lib/utils';

export default function AnomalySummary({ anomalies = [], onAnomalyClick }) {
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-md border border-white/50 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-red-500/10 flex items-center justify-center">
            <TrendingUp className="w-3.5 h-3.5 text-red-500" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Anomaly Summary</span>
        </div>
        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-700">
          {anomalies.length} active
        </span>
      </div>

      {/* List */}
      <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
        {anomalies.length === 0 ? (
          <div className="p-6 text-center">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-2">
              <TrendingUp className="w-5 h-5 text-slate-400" />
            </div>
            <p className="text-sm text-slate-400">No anomalies detected</p>
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
                className="w-full text-left p-3.5 hover:bg-slate-50 transition-colors group"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[12px] font-semibold text-slate-800 group-hover:text-teal-600 transition-colors">
                    {anomaly.pathogen}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                    isCritical ? 'bg-red-100 text-red-700' : isHigh ? 'bg-orange-100 text-orange-700' : 'bg-teal-100 text-teal-700'
                  }`}>
                    {severity} · {anomaly.riskScore}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-[10px] text-slate-400 mb-1">
                  <span className="font-medium text-slate-600">
                    {anomaly.drug}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-2.5 h-2.5" />
                    {anomaly.county}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-[10px]">
                    <span className="flex items-center gap-1 text-red-500 font-medium">
                      <TrendingUp className="w-2.5 h-2.5" />
                      Rising
                    </span>
                    <span className="text-slate-400">
                      {formatTimeAgo(anomaly.triggeredAt)}
                    </span>
                  </div>
                  <ChevronRight className="w-3 h-3 text-slate-300 group-hover:text-teal-500 transition-colors" />
                </div>

                {/* Risk bar */}
                <div className="mt-2 h-1 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isCritical ? 'bg-red-500' : isHigh ? 'bg-orange-500' : 'bg-teal-500'
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
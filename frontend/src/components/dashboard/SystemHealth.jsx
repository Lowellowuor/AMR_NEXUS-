// src/components/dashboard/SystemHealth.jsx
import { ServerIcon, CubeIcon, ClockIcon } from '@heroicons/react/24/outline';

export default function SystemHealth({ health, lastPrediction }) {  // âœ... default export
  const isOnline = health && health.status === 'ok';
  const lastPredictionDate = lastPrediction ? new Date(lastPrediction).toLocaleString() : 'Never';

  return (
    <div className="bg-[var(--bg-secondary)]/80 backdrop-blur-sm rounded-2xl shadow-md border border-white/50 p-5">
      <h3 className="text-md font-semibold text-[var(--text-primary)] mb-3">System Health</h3>
      <div className="space-y-2">
        <div className="flex items-center justify-between py-2 border-b border-[var(--border-primary)]">
          <div className="flex items-center gap-2">
            <ServerIcon className="h-4 w-4 text-[var(--text-muted)]" />
            <span className="text-sm text-[var(--text-secondary)]">Backend API</span>
          </div>
          <span className={`text-sm font-medium ${isOnline ? 'text-[var(--status-success)]' : 'text-[var(--status-critical)]'}`}>
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>
        <div className="flex items-center justify-between py-2 border-b border-[var(--border-primary)]">
          <div className="flex items-center gap-2">
            <CubeIcon className="h-4 w-4 text-[var(--text-muted)]" />
            <span className="text-sm text-[var(--text-secondary)]">ML Model</span>
          </div>
          <span className="text-sm font-medium text-[var(--text-secondary)]">{health?.service || 'XGBoost v1.0'}</span>
        </div>
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-2">
            <ClockIcon className="h-4 w-4 text-[var(--text-muted)]" />
            <span className="text-sm text-[var(--text-secondary)]">Last Prediction</span>
          </div>
          <span className="text-xs text-[var(--text-muted)]">{lastPredictionDate}</span>
        </div>
      </div>
    </div>
  );
}
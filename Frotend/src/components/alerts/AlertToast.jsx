import { useEffect, useState } from 'react';
import { X, Bell, MessageSquare, AlertTriangle } from 'lucide-react';
import { getRiskLabel } from '../../lib/utils';

export default function AlertToast({ alerts = [], onAlertClick, onDismiss }) {
  const [visibleAlerts, setVisibleAlerts] = useState([]);

  useEffect(() => {
    if (alerts.length === 0) return;

    const critical = alerts.filter(a => a.riskScore >= 90);
    const high = alerts.filter(a => a.riskScore >= 75 && a.riskScore < 90);
    const toShow = critical.length > 0 ? critical[0] : high.length > 0 ? high[0] : alerts[0];

    if (!visibleAlerts.find(v => v.id === toShow.id)) {
      setVisibleAlerts(prev => [...prev, { ...toShow, timestamp: Date.now() }]);

      const timer = setTimeout(() => {
        setVisibleAlerts(prev => prev.filter(v => v.timestamp !== toShow.timestamp));
      }, 8000);

      return () => clearTimeout(timer);
    }
  }, [alerts, visibleAlerts]);

  if (visibleAlerts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[200] space-y-3 max-w-sm">
      {visibleAlerts.map(alert => {
        const severity = getRiskLabel(alert.riskScore);
        const isCritical = severity === 'Critical';
        const isHigh = severity === 'High';

        const borderColor = isCritical ? 'border-l-red-500' : isHigh ? 'border-l-red-400' : 'border-l-teal-500';
        const bgColor = isCritical
          ? 'bg-red-50/95 dark:bg-red-950/90'
          : isHigh
          ? 'bg-red-50/80 dark:bg-red-950/70'
          : 'bg-teal-50/95 dark:bg-teal-950/70';

        const iconColor = isCritical || isHigh ? 'text-[var(--accent-red)]' : 'text-[var(--accent-cyan)]';
        const iconBg = isCritical || isHigh ? 'bg-red-100 dark:bg-red-900/30' : 'bg-teal-100 dark:bg-teal-900/30';

        return (
          <div
            key={alert.timestamp}
            className={`${bgColor} ${borderColor} border-l-[3px] border border-[var(--border-primary)] rounded-xl p-4 shadow-xl backdrop-blur-xl animate-in slide-in-from-right-full duration-300`}
          >
            <div className="flex items-start gap-3">
              <div className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                <AlertTriangle className={`w-4 h-4 ${iconColor}`} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`pill text-[10px] ${isCritical || isHigh ? 'pill-red' : 'pill-teal'}`}>
                        {severity}
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)]">
                        Score: {alert.riskScore}
                      </span>
                    </div>
                    <p className="text-[12px] font-semibold text-[var(--text-primary)] mt-1.5">
                      {alert.pathogen}
                    </p>
                    <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 line-clamp-2 leading-relaxed">
                      {alert.summary}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setVisibleAlerts(prev => prev.filter(v => v.timestamp !== alert.timestamp));
                      onDismiss?.(alert);
                    }}
                    className="p-1 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] transition-colors flex-shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={() => {
                      onAlertClick?.(alert);
                      setVisibleAlerts(prev => prev.filter(v => v.timestamp !== alert.timestamp));
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--accent-cyan)] text-[var(--text-inverse)] text-[11px] font-semibold hover:opacity-90 transition-opacity"
                  >
                    <Bell className="w-3 h-3" />
                    Investigate
                  </button>
                  <button
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent('sms-notification', { detail: alert }));
                      setVisibleAlerts(prev => prev.filter(v => v.timestamp !== alert.timestamp));
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-secondary)] text-[11px] font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                  >
                    <MessageSquare className="w-3 h-3" />
                    Send SMS
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
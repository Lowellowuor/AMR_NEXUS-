import { AlertOctagon, X } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function CriticalAlertBanner({ alerts = [] }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(alerts.some(a => a.riskScore >= 90));
  }, [alerts]);

  if (!visible) return null;

  return (
    <div className="sticky top-0 z-50 mb-4">
      <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/30 backdrop-blur-md animate-pulse">
        <div className="flex items-center gap-2">
          <AlertOctagon className="w-5 h-5 text-red-500" />
          <span className="text-sm font-bold text-red-600 dark:text-red-400 tracking-wide">
            CRITICAL AMR ALERT DETECTED
          </span>
        </div>
        <button
          onClick={() => setVisible(false)}
          className="p-1 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
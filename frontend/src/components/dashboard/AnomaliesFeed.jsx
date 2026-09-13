import { useState, useEffect } from 'react';
import { BellAlertIcon, CheckCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import api from '../../api/client';
import { timeAgo } from '../../lib/format';

export default function AnomaliesFeed({
  county = '',
  startDate = '',
  endDate = '',
  limit = 10,
  autoRefresh = true,
  refreshInterval = 30000,
}) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dismissing, setDismissing] = useState({});

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (county) params.append('county', county);
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      if (limit) params.append('limit', limit);
      const data = await api.getAlerts(params.toString());
      setAlerts(data || []);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
      setError('Could not load alerts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    if (autoRefresh) {
      const interval = setInterval(fetchAlerts, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [county, startDate, endDate, limit, autoRefresh, refreshInterval]);

  const handleDismiss = async (id) => {
    setDismissing((prev) => ({ ...prev, [id]: true }));
    try {
      await api.markAlertRead(id);
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      console.error('Failed to dismiss alert:', err);
      await fetchAlerts();
    } finally {
      setDismissing((prev) => {
        const newState = { ...prev };
        delete newState[id];
        return newState;
      });
    }
  };

  const handleMarkAllRead = async () => {
    const ids = alerts.map((a) => a.id);
    try {
      await Promise.all(ids.map((id) => api.markAlertRead(id)));
      setAlerts([]);
    } catch (err) {
      console.error('Failed to mark all read:', err);
      await fetchAlerts();
    }
  };

  const activeAlerts = alerts.filter((a) => !a.is_read);

  if (loading && alerts.length === 0) {
    return (
      <div className="bg-[var(--bg-secondary)]/80 backdrop-blur-sm rounded-2xl shadow-md border border-white/50 p-5">
        <div className="flex items-center gap-2 mb-2">
          <BellAlertIcon className="h-5 w-5 text-[var(--text-muted)] animate-pulse" />
          <h3 className="text-md font-semibold text-[var(--text-primary)]">Recent Alerts</h3>
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-10 bg-[var(--border-primary)] rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[var(--bg-secondary)]/80 backdrop-blur-sm rounded-2xl shadow-md border border-white/50 p-5">
        <p className="text-[var(--status-critical)] text-sm">{error}</p>
        <button
          onClick={fetchAlerts}
          className="mt-2 text-[var(--accent-teal)] underline text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  if (activeAlerts.length === 0) {
    return (
      <div className="bg-[var(--bg-secondary)]/80 backdrop-blur-sm rounded-2xl shadow-md border border-white/50 p-5">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircleIcon className="h-5 w-5 text-[var(--status-success)]" />
          <h3 className="text-md font-semibold text-[var(--text-primary)]">Recent Alerts</h3>
        </div>
        <p className="text-[var(--text-muted)] text-center py-4">No active alerts. System is stable.</p>
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg-secondary)]/80 backdrop-blur-sm rounded-2xl shadow-md border border-white/50 p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <BellAlertIcon className="h-5 w-5 text-[var(--status-warning)]" />
          <h3 className="text-md font-semibold text-[var(--text-primary)]">
            Recent Alerts ({activeAlerts.length})
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleMarkAllRead}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
          >
            Mark all read
          </button>
          <button
            onClick={fetchAlerts}
            className="text-xs text-[var(--accent-teal)] hover:text-[var(--accent-teal)] transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
        {activeAlerts.map((alert) => (
          <div
            key={alert.id}
            className="border-l-4 border-[var(--status-warning)] pl-3 py-2 bg-[var(--bg-tertiary)]/50 rounded-r-lg hover:bg-[var(--bg-tertiary)]/50 transition-colors"
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  {alert.county} â€“ {alert.message}
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  {timeAgo(alert.created_at || alert.timestamp)}
                </p>
              </div>
              <button
                onClick={() => handleDismiss(alert.id)}
                disabled={dismissing[alert.id]}
                className="ml-2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] disabled:opacity-50"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {activeAlerts.length > 0 && (
        <div className="mt-3 text-right">
          <a href="/alerts" className="text-xs text-[var(--accent-teal)] hover:underline">
            View all â†’
          </a>
        </div>
      )}
    </div>
  );
}
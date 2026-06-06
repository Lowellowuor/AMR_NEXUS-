// src/pages/Alerts.jsx
import { useEffect, useState } from 'react';
import api from '../api/client';

export default function Alerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAlerts = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch recent predictions (last 100) to get anomalies
        const predictions = await api.getPredictions(100, 0);
        
        // Fetch summary for overall MDR rate
        const summary = await api.getSummary();

        // Build alerts list
        const newAlerts = [];

        // 1. Anomaly alerts from recent predictions
        const anomalies = predictions.filter(p => p.anomaly_detected === true);
        anomalies.forEach(anomaly => {
          newAlerts.push({
            id: `anomaly-${anomaly.record_id}`,
            message: `⚠️ Anomaly detected: Unusual resistance pattern for ${anomaly.pathogen_code?.toUpperCase()} in ${anomaly.county}`,
            timestamp: anomaly.timestamp,
            severity: 'medium',
            type: 'anomaly'
          });
        });

        // 2. High MDR rate alert if overall rate > 30%
        if (summary.mdr_rate > 30) {
          newAlerts.push({
            id: 'high-mdr',
            message: `📈 High MDR rate alert: Overall resistance rate is ${summary.mdr_rate}% – above threshold (30%)`,
            timestamp: new Date().toISOString(),
            severity: 'high',
            type: 'trend'
          });
        }

        // 3. (Optional) Add alert if total records are low? Not needed.

        // Sort by timestamp (newest first)
        newAlerts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        setAlerts(newAlerts);
      } catch (err) {
        console.error('Failed to load alerts:', err);
        setError('Could not load alerts. Is the backend running?');
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();
    // Optional: refresh every 60 seconds
    const interval = setInterval(fetchAlerts, 60000);
    return () => clearInterval(interval);
  }, []);

  const dismissAlert = (id) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id));
    // In a real implementation, you might call an API to mark as dismissed
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500 p-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg">
        <p>{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-full hover:bg-primary-700 transition"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Stewardship Alerts</h1>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full shadow-sm text-sm font-medium text-gray-700 hover:bg-white hover:shadow-md transition-all"
        >
          ⟳ Refresh
        </button>
      </div>

      {alerts.length === 0 ? (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-md p-8 text-center border border-white/50">
          <p className="text-gray-500">No active alerts. All systems normal.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {alerts.map(alert => (
            <div
              key={alert.id}
              className={`bg-white/80 backdrop-blur-sm rounded-2xl shadow-md border-l-4 overflow-hidden transition-all
                ${alert.severity === 'high' ? 'border-l-red-500' : 'border-l-yellow-500'}`}
            >
              <div className="p-5">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {alert.severity === 'high' && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Critical
                        </span>
                      )}
                      {alert.severity === 'medium' && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Warning
                        </span>
                      )}
                      <span className="text-xs text-gray-400">
                        {new Date(alert.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-gray-800">{alert.message}</p>
                    {alert.type === 'anomaly' && (
                      <p className="text-sm text-gray-500 mt-2">
                        This isolate showed an unusual resistance pattern not typical for this pathogen/location.
                      </p>
                    )}
                    {alert.type === 'trend' && (
                      <p className="text-sm text-gray-500 mt-2">
                        Consider reviewing antibiotic stewardship programmes in affected regions.
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => dismissAlert(alert.id)}
                    className="ml-4 text-sm text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
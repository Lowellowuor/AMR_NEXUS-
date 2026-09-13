import { useState, useEffect } from 'react';
import api from '../api/client';

export function useNotifications() {
  const [count, setCount] = useState(0);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const data = await api.getPredictions(100, 0);
      const predictions = Array.isArray(data) ? data : data?.records ?? [];
      const anomalies = predictions.filter((p) => p.anomaly_detected);

      setCount(anomalies.length);
      setAlerts(
        anomalies.slice(0, 5).map((a) => ({
          id: a.record_id,
          message: `${a.pathogen_code?.toUpperCase() ?? 'UNKNOWN'} in ${a.county || 'unknown county'}`,
          timestamp: a.timestamp,
          severity: 'medium',
        })),
      );
    } catch (err) {
      console.error('Notification fetch failed', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  return { count, alerts, loading, refresh: fetchNotifications };
}

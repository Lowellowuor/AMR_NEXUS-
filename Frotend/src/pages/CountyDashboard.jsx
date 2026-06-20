import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/client';

export default function CountyDashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (user.county) params.append('county', user.county);
    const qs = params.toString();

    Promise.all([
      api.getSummary(qs),
      api.getAlerts(qs)
    ]).then(([summ, alerts]) => {
      setSummary(summ);
      setRecentAlerts(alerts.slice(0, 5));
      setLoading(false);
    }).catch(err => {
      console.error('CountyDashboard fetch error:', err);
      setError('Could not load data.');
      setLoading(false);
    });
  }, [user.county]);

  if (loading) return <div className="text-center py-8">Loading dashboard...</div>;
  if (error) return <div className="text-center py-8 text-red-500">{error}</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">County Dashboard – {user.county}</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white/80 p-4 rounded-2xl">
          <p className="text-sm text-gray-500">County Records</p>
          <p className="text-2xl font-bold">{summary?.total_records || 0}</p>
        </div>
        <div className="bg-white/80 p-4 rounded-2xl">
          <p className="text-sm text-gray-500">Local MDR Rate</p>
          <p className="text-2xl font-bold text-red-600">{summary?.mdr_rate || 0}%</p>
        </div>
        <div className="bg-white/80 p-4 rounded-2xl">
          <p className="text-sm text-gray-500">Active Alerts</p>
          <p className="text-2xl font-bold text-yellow-600">{recentAlerts.length}</p>
        </div>
      </div>
      {recentAlerts.length > 0 && (
        <div className="bg-white/80 rounded-2xl p-5">
          <h3 className="text-lg font-semibold mb-3">Recent Alerts in Your County</h3>
          <div className="space-y-3">
            {recentAlerts.map(alert => (
              <div key={alert.id} className="border-l-4 border-yellow-500 pl-3 py-2">
                <p className="text-sm font-medium">{alert.message}</p>
                <p className="text-xs text-gray-500">{new Date(alert.timestamp).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

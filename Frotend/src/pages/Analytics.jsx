// src/pages/Analytics.jsx
import { useEffect, useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import Card from '../components/ui/Card';
import api from '../api/client';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function Analytics() {
  const [summary, setSummary] = useState({
    total_records: 0,
    mdr_rate: 0,
    anomaly_count: 0,
    active_counties: 0
  });
  const [trendData, setTrendData] = useState([]);
  const [pathogenData, setPathogenData] = useState([]);
  const [sectorData, setSectorData] = useState([]);
  const [countyData, setCountyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchAllData = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const [summ, trend, path, sect, counties] = await Promise.all([
        api.getSummary(),
        api.getMDRTrend(6),
        api.getByPathogen(10),
        api.getBySector(),
        api.getTopCounties(5)
      ]);
      setSummary(summ);
      setTrendData(trend);
      setPathogenData(path);
      setSectorData(sect);
      setCountyData(counties);
    } catch (err) {
      console.error('Analytics error:', err);
      setError('Could not load analytics data. Is the backend running?');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

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
          onClick={() => fetchAllData(true)}
          className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-full hover:bg-primary-700 transition"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with title and refresh button */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">AMR Analytics Dashboard</h1>
        <button
          onClick={() => fetchAllData(true)}
          disabled={refreshing}
          className="px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full shadow-sm text-sm font-medium text-gray-700 hover:bg-white hover:shadow-md transition-all disabled:opacity-50"
        >
          {refreshing ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4 text-primary-600" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Refreshing...
            </span>
          ) : (
            '⟳ Refresh'
          )}
        </button>
      </div>

      {/* Summary Cards – glassmorphic style */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-md p-5 border border-white/50">
          <p className="text-sm text-gray-500">Total Records</p>
          <p className="text-2xl font-bold text-gray-900">{summary.total_records?.toLocaleString() || 0}</p>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-md p-5 border border-white/50">
          <p className="text-sm text-gray-500">MDR Rate</p>
          <p className="text-2xl font-bold text-red-600">{summary.mdr_rate || 0}%</p>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-md p-5 border border-white/50">
          <p className="text-sm text-gray-500">Anomalies Detected</p>
          <p className="text-2xl font-bold text-yellow-600">{summary.anomaly_count || 0}</p>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-md p-5 border border-white/50">
          <p className="text-sm text-gray-500">Active Counties</p>
          <p className="text-2xl font-bold text-primary-600">{summary.active_counties || 0}</p>
        </div>
      </div>

      {/* Charts – each chart inside glass‑morphic card */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* MDR Trend Line Chart */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-md p-5 border border-white/50">
          <h3 className="text-md font-semibold mb-2 text-gray-800">MDR Trend (6 months)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis domain={[0, 100]} unit="%" />
              <Tooltip formatter={(value) => `${value}%`} />
              <Legend />
              <Line type="monotone" dataKey="rate" stroke="#3b82f6" strokeWidth={2} name="MDR Rate (%)" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Resistance by Pathogen */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-md p-5 border border-white/50">
          <h3 className="text-md font-semibold mb-2 text-gray-800">Resistance by Pathogen</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={pathogenData} layout="vertical" margin={{ left: 40 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" domain={[0, 100]} unit="%" />
              <YAxis type="category" dataKey="name" width={80} />
              <Tooltip formatter={(value) => `${value}%`} />
              <Bar dataKey="resistance" fill="#10b981" name="Resistance (%)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* MDR by Sector (Pie Chart) */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-md p-5 border border-white/50">
          <h3 className="text-md font-semibold mb-2 text-gray-800">MDR by Sector</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={sectorData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                dataKey="value"
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              >
                {sectorData.map((entry, index) => (
                  <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `${value}%`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Top 5 Counties by Resistance */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-md p-5 border border-white/50">
          <h3 className="text-md font-semibold mb-2 text-gray-800">Top 5 Counties by Resistance</h3>
          <div className="space-y-3">
            {countyData.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No county data available</p>
            ) : (
              countyData.map((item) => (
                <div key={item.county} className="flex justify-between items-center">
                  <span className="text-sm text-gray-700 w-24 truncate">{item.county}</span>
                  <div className="flex-1 mx-4 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="bg-primary-600 h-full rounded-full"
                      style={{ width: `${item.rate}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium w-10 text-right">{item.rate}%</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
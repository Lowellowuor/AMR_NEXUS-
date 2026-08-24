import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function ReportPreview({ reportType, data, loading }) {
  if (loading) return <div className="text-center py-10 text-[var(--text-muted)]">Loading report data...</div>;
  if (data?.error) return <div className="text-red-500 text-center py-10">{data.error}</div>;
  if (!data) return <div className="text-[var(--text-muted)] text-center py-10">No data. Select a report type.</div>;

  const renderContent = () => {
    switch (reportType) {
      case 'mdr_summary':
        return (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[var(--bg-tertiary)] p-4 rounded-xl text-center">
              <p className="text-sm text-[var(--text-muted)]">Total Records</p>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{data.total_records || 0}</p>
            </div>
            <div className="bg-[var(--bg-tertiary)] p-4 rounded-xl text-center">
              <p className="text-sm text-[var(--text-muted)]">MDR Rate</p>
              <p className="text-2xl font-bold text-red-500">{data.mdr_rate || 0}%</p>
            </div>
            <div className="bg-[var(--bg-tertiary)] p-4 rounded-xl text-center">
              <p className="text-sm text-[var(--text-muted)]">Anomalies</p>
              <p className="text-2xl font-bold text-yellow-500">{data.anomaly_count || 0}</p>
            </div>
            <div className="bg-[var(--bg-tertiary)] p-4 rounded-xl text-center">
              <p className="text-sm text-[var(--text-muted)]">Active Counties</p>
              <p className="text-2xl font-bold text-[var(--accent-cyan)]">{data.active_counties || 0}</p>
            </div>
          </div>
        );
      case 'anomaly_report':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[var(--bg-tertiary)] p-4 rounded-xl text-center">
                <p className="text-sm text-[var(--text-muted)]">Total Predictions</p>
                <p className="text-2xl font-bold text-[var(--text-primary)]">{data.total_predictions || 0}</p>
              </div>
              <div className="bg-[var(--bg-tertiary)] p-4 rounded-xl text-center">
                <p className="text-sm text-[var(--text-muted)]">Anomaly Rate</p>
                <p className="text-2xl font-bold text-yellow-500">{data.anomaly_rate?.toFixed(1) || 0}%</p>
              </div>
            </div>
            {data.recent_anomalies?.length > 0 && (
              <div>
                <p className="font-medium mb-2 text-[var(--text-primary)]">Recent Anomalies</p>
                <ul className="space-y-1">
                  {data.recent_anomalies.map((a, i) => (
                    <li key={`${a.id}-${i}`} className="text-sm border-l-4 border-yellow-500 pl-2 text-[var(--text-secondary)]">
                      {a.pathogen_code?.toUpperCase()} in {a.county} – {new Date(a.timestamp).toLocaleDateString()}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      case 'sector_comparison':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data.sectors}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label
              >
                {data.sectors?.map((_, idx) => (
                  <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );
      case 'county_ranking':
        return (
          <div className="space-y-2">
            {data.counties?.map((c, i) => (
              <div key={c.id || `${c.county}-${i}`} className="flex justify-between items-center p-2 bg-[var(--bg-tertiary)] rounded">
                <span className="text-[var(--text-primary)]">{i + 1}. {c.county}</span>
                <span className="font-bold text-[var(--accent-cyan)]">{c.rate}%</span>
              </div>
            ))}
          </div>
        );
      case 'pathogen_wise':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={data.pathogens} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
              <XAxis type="number" unit="%" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
              <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
              <Tooltip formatter={(v) => `${v}%`} />
              <Bar dataKey="resistance" fill="#3b82f6" name="Resistance (%)" />
            </BarChart>
          </ResponsiveContainer>
        );
      case 'trend':
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data.trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
              <YAxis unit="%" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
              <Tooltip formatter={(v) => `${v}%`} />
              <Legend />
              <Line type="monotone" dataKey="rate" stroke="#3b82f6" strokeWidth={2} name="MDR Rate (%)" />
            </LineChart>
          </ResponsiveContainer>
        );
      default:
        return <p className="text-center text-[var(--text-muted)]">Select a report type to see preview.</p>;
    }
  };

  return (
    <div className="bg-[var(--bg-secondary)]/80 backdrop-blur-sm rounded-2xl shadow-md border border-[var(--border-primary)] p-6">
      <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-4">
        Report Preview – {reportType.replace('_', ' ').toUpperCase()}
      </h2>
      {renderContent()}
    </div>
  );
}
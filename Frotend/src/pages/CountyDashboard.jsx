import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useOutletContext } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { DataCard } from '../components/ui/DataCard';
import AlertDetailModal from '../components/alerts/AlertDetailModal';
import CountyTrendChart from '../components/trends/CountyTrendChart';
import CriticalAlertBanner from '../components/alerts/CriticalAlertBanner';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import { fetchSummary, fetchAlerts, getMDRTrend, getResistanceByPathogen } from '../api/endpoints';

export default function CountyDashboard() {
  const { selectedCounty, role, counties } = useOutletContext();
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const countyName = counties?.find(c => c.code === selectedCounty)?.name || selectedCounty;

  const { data: summary } = useQuery({
    queryKey: ['summary', selectedCounty],
    queryFn: fetchSummary,
  });

  const { data: alerts } = useQuery({
    queryKey: ['alerts', selectedCounty],
    queryFn: fetchAlerts,
  });

  const { data: trendData } = useQuery({
    queryKey: ['mdr-trend', selectedCounty],
    queryFn: () => getMDRTrend(12, `county=${encodeURIComponent(selectedCounty)}`),
    enabled: !!selectedCounty,
  });

  const { data: pathogenData } = useQuery({
    queryKey: ['resistance-pathogen', selectedCounty],
    queryFn: () => getResistanceByPathogen(10, `county=${encodeURIComponent(selectedCounty)}`),
    enabled: !!selectedCounty,
  });

  return (
    <div className="space-y-5">
      <CriticalAlertBanner alerts={alerts || []} />

      <DataCard>
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                {countyName} Dashboard
              </h1>
              <p className="text-sm text-slate-600">
                County Veterinarian View · Poultry & Livestock AMR Surveillance
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <span className="pill pill-teal">Poultry Focus</span>
            <span className="pill pill-slate">Real-time Data</span>
          </div>
        </div>
      </DataCard>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-md p-5 border border-white/50">
          <p className="text-sm text-gray-500">Total Isolates</p>
          <p className="text-2xl font-bold text-gray-900">{summary?.totalIsolates?.toLocaleString() || 0}</p>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-md p-5 border border-white/50">
          <p className="text-sm text-gray-500">Active Anomalies</p>
          <p className="text-2xl font-bold text-red-600">{summary?.activeAnomalies || 0}</p>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-md p-5 border border-white/50">
          <p className="text-sm text-gray-500">MDR Rate</p>
          <p className="text-2xl font-bold text-yellow-600">{summary?.mdrRate || 0}%</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DataCard title={`MDR Trend (12 months) – ${countyName}`}>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendData || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748B' }} />
              <YAxis unit="%" domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748B' }} />
              <Tooltip formatter={(v) => `${v}%`} />
              <Line type="monotone" dataKey="rate" stroke="#3b82f6" strokeWidth={2} name="MDR Rate (%)" dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </DataCard>

        <DataCard title="Resistance by Pathogen">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={pathogenData || []} layout="vertical" margin={{ left: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fontSize: 11, fill: '#64748B' }} />
              <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11, fill: '#64748B' }} />
              <Tooltip formatter={(v) => `${v}%`} />
              <Bar dataKey="resistance" fill="#10b981" name="Resistance (%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </DataCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <CountyTrendChart county={selectedCounty} />
        </div>
        <div>
          <DataCard title={`Local Alerts (${alerts?.length || 0})`}>
            {alerts?.map(alert => (
              <button
                key={alert.id}
                onClick={() => { setSelectedAlert(alert.id); setModalOpen(true); }}
                className="w-full text-left p-3 rounded-lg mb-2 border-l-4 border-l-red-500 bg-red-50 hover:bg-red-100 transition-colors"
              >
                <p className="text-sm font-semibold text-slate-900">{alert.pathogen}</p>
                <p className="text-xs text-slate-600 mt-0.5">{alert.summary}</p>
                <p className="text-[10px] text-slate-400 mt-1">{alert.subCounty} · Risk: {alert.riskScore}</p>
              </button>
            ))}
          </DataCard>
        </div>
      </div>

      <AlertDetailModal
        alertId={selectedAlert}
        role={role}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
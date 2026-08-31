import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DataCard } from '../components/ui/DataCard';
import CountyChoroplethMap from '../components/map/CountyChoroplethMap';
import MapTimeSlider from '../components/map/MapTimeSlider';
import AlertFeedPanel from '../components/alerts/AlertFeedPanel';
import AlertDetailModal from '../components/alerts/AlertDetailModal';
import AlertToast from '../components/alerts/AlertToast';
import SMSNotificationModal from '../components/alerts/SMSNotificationModal';
import AnomalySummary from '../components/trends/AnomalySummary';
import CriticalAlertBanner from '../components/alerts/CriticalAlertBanner';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import { fetchSummary, fetchAlerts, getMDRTrend, getResistanceByPathogen } from '../api/endpoints';

export default function NationalDashboard() {
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const { data: summary } = useQuery({
    queryKey: ['summary', 'national'],
    queryFn: fetchSummary,
  });

  const { data: alerts } = useQuery({
    queryKey: ['alerts', 'national'],
    queryFn: fetchAlerts,
  });

  const { data: trendData } = useQuery({
    queryKey: ['mdr-trend', 'national'],
    queryFn: () => getMDRTrend(12, ''),
  });

  const { data: pathogenData } = useQuery({
    queryKey: ['resistance-pathogen', 'national'],
    queryFn: () => getResistanceByPathogen(10, ''),
  });

  const handleAlertClick = (alert) => {
    setSelectedAlert(alert.id);
    setModalOpen(true);
  };

  return (
    <div className="space-y-5">
      <CriticalAlertBanner alerts={alerts || []} />

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            National AMR Surveillance Overview
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            AI-Powered Early Warning Platform · Real-time Data
          </p>
        </div>
        <span className="pill pill-slate">National view</span>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-md p-5 border border-white/50">
          <p className="text-sm text-gray-500">Total Isolates</p>
          <p className="text-2xl font-bold text-gray-900">{summary?.totalIsolates?.toLocaleString() || 0}</p>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-md p-5 border border-white/50">
          <p className="text-sm text-gray-500">MDR Rate</p>
          <p className="text-2xl font-bold text-red-600">{summary?.mdrRate || 0}%</p>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-md p-5 border border-white/50">
          <p className="text-sm text-gray-500">Active Anomalies</p>
          <p className="text-2xl font-bold text-yellow-600">{summary?.activeAnomalies || 0}</p>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-md p-5 border border-white/50">
          <p className="text-sm text-gray-500">Counties Reporting</p>
          <p className="text-2xl font-bold text-teal-600">{summary?.countiesReporting || 0}</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DataCard title="National MDR Trend (12 months)">
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

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        <div className="lg:col-span-3 space-y-4">
          <DataCard title="Surveillance Heatmap" className="p-0 overflow-hidden">
            <div className="h-[450px]">
              <CountyChoroplethMap
                darkMode={false}
                onCountyClick={(props) => {
                  const alert = alerts?.find(a => a.county === props.county);
                  if (alert) {
                    setSelectedAlert(alert.id);
                    setModalOpen(true);
                  }
                }}
              />
            </div>
          </DataCard>
          <MapTimeSlider />
        </div>

        <div className="space-y-4">
          <AlertFeedPanel alerts={alerts || []} onAlertClick={handleAlertClick} />
          <AnomalySummary anomalies={alerts || []} onAnomalyClick={(a) => handleAlertClick({ id: a.id })} />
        </div>
      </div>

      {/* Modals and toasts */}
      <AlertDetailModal
        alertId={selectedAlert}
        role="national"
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
      <AlertToast alerts={alerts || []} onAlertClick={handleAlertClick} />
      <SMSNotificationModal />
    </div>
  );
}
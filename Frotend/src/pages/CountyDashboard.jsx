import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useOutletContext } from 'react-router-dom';
import { Bug, AlertTriangle, Pill, MapPin } from 'lucide-react';
import { KPICard } from '../components/ui/KPICard';
import { DataCard } from '../components/ui/DataCard';
import AlertDetailModal from '../components/alerts/AlertDetailModal';
import CountyTrendChart from '../components/trends/CountyTrendChart';
import CriticalAlertBanner from '../components/alerts/CriticalAlertBanner';
import { fetchSummary, fetchAlerts } from '../api/endpoints';

export default function CountyDashboard() {
  const { selectedCounty, role } = useOutletContext();
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const { data: summary } = useQuery({
    queryKey: ['summary', selectedCounty],
    queryFn: fetchSummary,
  });

  const { data: alerts } = useQuery({
    queryKey: ['alerts', selectedCounty],
    queryFn: fetchAlerts,
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
                {selectedCounty || 'County'} Dashboard
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

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard label="Total Isolates" value={summary?.totalIsolates || 0} icon={Bug} colorClass="teal" />
        <KPICard label="Active Anomalies" value={summary?.activeAnomalies || 0} icon={AlertTriangle} colorClass="red" />
        <KPICard label="MDR Rate" value={summary?.mdrRate || 0} icon={Pill} colorClass="amber" />
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
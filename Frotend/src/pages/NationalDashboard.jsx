import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { FlaskConical, AlertTriangle, Building2, Bug } from 'lucide-react';
import { KPICard } from '../components/ui/KPICard';
import { DataCard } from '../components/ui/DataCard';
import CountyChoroplethMap from '../components/map/CountyChoroplethMap';
import MapTimeSlider from '../components/map/MapTimeSlider';
import AlertFeedPanel from '../components/alerts/AlertFeedPanel';
import AlertDetailModal from '../components/alerts/AlertDetailModal';
import AlertToast from '../components/alerts/AlertToast';
import SMSNotificationModal from '../components/alerts/SMSNotificationModal';
import AnomalySummary from '../components/trends/AnomalySummary';
import CriticalAlertBanner from '../components/alerts/CriticalAlertBanner';
import { fetchSummary, fetchAlerts } from '../api/endpoints';

export default function NationalDashboard() {
  const { user } = useAuth();
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['summary', 'national'],
    queryFn: fetchSummary,
  });

  const { data: alerts, isLoading: alertsLoading } = useQuery({
    queryKey: ['alerts', 'national'],
    queryFn: fetchAlerts,
  });

  const handleAlertClick = (alert) => {
    setSelectedAlert(alert.id);
    setModalOpen(true);
  };

  return (
    <div className="space-y-5">
      <CriticalAlertBanner alerts={alerts || []} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
            National AMR Surveillance Overview
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            AI-Powered Early Warning Platform · Real-time Data
          </p>
        </div>
        <span className="pill pill-slate">National view</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Total Isolates"
          value={summary?.totalIsolates || 0}
          icon={FlaskConical}
          colorClass="blue"
        />
        <KPICard
          label="Active Anomalies"
          value={summary?.activeAnomalies || 0}
          icon={AlertTriangle}
          colorClass="red"
        />
        <KPICard
          label="Counties Reporting"
          value={summary?.countiesReporting || 0}
          icon={Building2}
          colorClass="blue"
        />
        <KPICard
          label="One Health Signals"
          value={summary?.oneHealthSignals || 0}
          icon={Bug}
          colorClass="amber"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        <div className="lg:col-span-3 space-y-4">
          <DataCard title="Surveillance Heatmap" className="p-0 overflow-hidden">
            <div className="h-[450px]">
              <CountyChoroplethMap
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
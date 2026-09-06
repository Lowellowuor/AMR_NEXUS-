import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DataCard } from '../components/ui/DataCard';
import CountyChoroplethMap from '../components/map/CountyChoroplethMap';
import MapFilters from '../components/map/MapFilters';
import CountyDetailPanel from '../components/map/CountyDetailPanel';
import AlertDetailModal from '../components/alerts/AlertDetailModal';
import { fetchAlerts } from '../api/endpoints';

export default function NationalMap({ role, darkMode }) {
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [filters, setFilters] = useState({
    metric: 'carbapenem',
    sector: 'all',
    mode: 'current',
    startMonth: '2024-01',
    endMonth: '2024-06',
  });
  const [selectedCounty, setSelectedCounty] = useState(null);

  const { data: alerts } = useQuery({
    queryKey: ['alerts', role],
    queryFn: fetchAlerts,
  });

  const isAdmin = role === 'admin';

  // Convert month strings to date strings for hotspot filtering (optional)
  // For now, we pass undefined to avoid 422; hotspot endpoint will return all hotspots.
  const startDate = filters.startMonth ? `${filters.startMonth}-01` : undefined;
  const endDate = filters.endMonth ? `${filters.endMonth}-28` : undefined; // rough end, but not used now

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">
            Surveillance Map
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            Interactive county-level resistance heatmap
          </p>
        </div>
        <MapFilters filters={filters} onChange={setFilters} />
      </div>

      <div className="flex-1 min-h-0 relative">
        <DataCard className="h-full p-0 overflow-hidden">
          <div className="h-full w-full" style={{ minHeight: '400px' }}>
            <CountyChoroplethMap
              darkMode={darkMode}
              mode={filters.mode}
              startMonth={filters.startMonth}
              endMonth={filters.endMonth}
              startDate={startDate}
              endDate={endDate}
              county={undefined}
              pathogen={undefined}
              onCountyClick={(props) => setSelectedCounty(props)}
              isAdmin={isAdmin}
            />
          </div>
        </DataCard>

        <CountyDetailPanel
          county={selectedCounty}
          alerts={alerts || []}
          onClose={() => setSelectedCounty(null)}
        />
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
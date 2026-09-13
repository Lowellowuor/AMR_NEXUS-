import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DataCard } from '../components/ui/DataCard';
import CountyChoroplethMap from '../components/map/CountyChoroplethMap';
import MapFilters from '../components/map/MapFilters';
import CountyDetailPanel from '../components/map/CountyDetailPanel';
import AlertDetailModal from '../components/alerts/AlertDetailModal';
import { fetchAlerts, getMonthRange } from '../api/endpoints';

const DEFAULT_FILTERS = {
  metric: '',
  sector: 'all',
  mode: 'current',
  startMonth: '',
  endMonth: '',
};

export default function NationalMap({ role, darkMode }) {
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedCounty, setSelectedCounty] = useState(null);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  const { data: monthRange, isLoading: rangeLoading } = useQuery({
    queryKey: ['month-range'],
    queryFn: getMonthRange,
    staleTime: 10 * 60 * 1000,
  });

  const { data: alerts } = useQuery({
    queryKey: ['alerts', role],
    queryFn: fetchAlerts,
  });

  useEffect(() => {
    if (!monthRange) return;
    setFilters((prev) => ({
      ...prev,
      startMonth: prev.startMonth || monthRange.min,
      endMonth: prev.endMonth || monthRange.max,
    }));
  }, [monthRange]);

  const isAdmin = role === 'admin';
  const startDate = filters.startMonth ? `${filters.startMonth}-01` : undefined;
  const endDate = filters.endMonth ? `${filters.endMonth}-28` : undefined;

  if (rangeLoading || !filters.startMonth || !filters.endMonth) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--accent-teal)]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full space-y-4">
      <div className="flex items-center justify-between shrink-0 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Surveillance Map</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            Interactive county-level resistance heatmap
          </p>
        </div>
        <MapFilters filters={filters} onChange={setFilters} monthRange={monthRange} />
      </div>

      <div className="flex-1 min-h-0 relative">
        <DataCard className="h-full p-0 overflow-hidden">
          <div className="h-full w-full" style={{ minHeight: 400 }}>
            <CountyChoroplethMap
              darkMode={darkMode}
              mode={filters.mode}
              startMonth={filters.startMonth}
              endMonth={filters.endMonth}
              startDate={startDate}
              endDate={endDate}
              county={undefined}
              pathogen={undefined}
              onCountyClick={setSelectedCounty}
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

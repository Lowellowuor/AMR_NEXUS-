import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Tooltip,
  Marker,
  Popup,
  useMap,
} from 'react-leaflet';
import { Loader2 } from 'lucide-react';
import { fetchSubCountyMDR, fetchMDRDifference, fetchHotspots } from '../../api/endpoints';
import HotspotDetailPanel from './HotspotDetailPanel';

function MapResizer() {
  const map = useMap();
  useEffect(() => {
    setTimeout(() => map.invalidateSize(), 100);
    const handleResize = () => map.invalidateSize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [map]);
  return null;
}

const getColor = (level) => {
  switch (level) {
    case 'high': return '#FF5A6E';
    case 'medium': return '#F59E0B';
    case 'low': return '#00FF88';
    default: return '#94A3B8';
  }
};

const OSM_TILE = {
  url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
};

export default function CountyChoroplethMap({
  darkMode = true,
  mode = 'current',
  startMonth,
  endMonth,
  startDate,
  endDate,
  county,
  pathogen,
  onCountyClick,
}) {
  const containerRef = useRef(null);
  const [mapReady, setMapReady] = useState(true);
  const [selectedHotspot, setSelectedHotspot] = useState(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey:
      mode === 'difference'
        ? ['mdr-difference', startMonth, endMonth]
        : ['sub-county-mdr'],
    queryFn:
      mode === 'difference'
        ? () => fetchMDRDifference(startMonth, endMonth)
        : fetchSubCountyMDR,
    staleTime: 5 * 60 * 1000,
  });

  const { data: hotspotsData } = useQuery({
    queryKey: ['hotspots', startDate, endDate, county, pathogen],
    queryFn: () => fetchHotspots({ start_date: startDate, end_date: endDate, county, pathogen }),
    enabled: true,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
          setMapReady(true);
        } else {
          setMapReady(false);
        }
      }
    });
    observer.observe(container);
    const rect = container.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) setMapReady(true);

    const timer = setTimeout(() => setMapReady(true), 500);

    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-[var(--bg-primary)] min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-cyan)]" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-[var(--bg-primary)] min-h-[400px] text-red-500">
        Error loading map data: {error?.message}
      </div>
    );
  }

  const features = data?.features || [];
  const isDark = darkMode !== false;
  const mapBackground = isDark ? '#0A0E17' : '#F8FAFC';

  return (
    <div
      key={isDark ? 'dark-map' : 'light-map'}
      ref={containerRef}
      className="h-full w-full relative"
      style={{ minHeight: 400, background: mapBackground }}
    >
      {!mapReady && (
        <div className="h-full w-full flex items-center justify-center text-[var(--text-muted)] text-sm">
          Loading map…
        </div>
      )}
      {mapReady && (
        <MapContainer
          center={[-0.5, 37.0]}
          zoom={7}
          style={{
            height: '100%',
            width: '100%',
            background: mapBackground,
            filter: isDark ? 'invert(1) hue-rotate(180deg)' : 'none',
          }}
          scrollWheelZoom={false}
          zoomControl={true}
        >
          <MapResizer />
          <TileLayer url={OSM_TILE.url} attribution={OSM_TILE.attribution} />

          {features.map((feature, idx) => {
            const props = feature.properties;
            const [lng, lat] = feature.geometry.coordinates;
            const value = props.mdr_rate ?? 0;
            const color = getColor(props.risk_level);

            return (
              <CircleMarker
                key={`${props.county}-${props.sub_county}-${idx}`}
                center={[lat, lng]}
                radius={Math.max(12, value * 60)}
                pathOptions={{ color, fillColor: color, fillOpacity: 0.5, weight: 1.5 }}
                eventHandlers={{ click: () => onCountyClick?.(props) }}
              >
                <Tooltip permanent direction="top" offset={[0, -Math.max(12, value * 60)]}>
                  <span style={{
                    textShadow: isDark ? '0 1px 4px black' : '0 1px 4px white',
                    color: isDark ? 'white' : '#0F172A',
                    fontWeight: 600,
                    fontSize: 12,
                  }}>
                    {props.sub_county} ({Math.round(value * 100)}%)
                  </span>
                </Tooltip>
              </CircleMarker>
            );
          })}

          {hotspotsData?.map((hotspot) => (
            <Marker
              key={`hotspot-${hotspot.id}`}
              position={[hotspot.latitude, hotspot.longitude]}
              eventHandlers={{ click: () => setSelectedHotspot(hotspot) }}
            >
              <Popup>
                <div>
                  <strong>{hotspot.name}</strong><br />
                  <span>Resistance: {hotspot.resistance_rate?.toFixed(1)}%</span>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      )}

      {selectedHotspot && (
        <HotspotDetailPanel
          hotspot={selectedHotspot}
          onClose={() => setSelectedHotspot(null)}
        />
      )}
    </div>
  );
}
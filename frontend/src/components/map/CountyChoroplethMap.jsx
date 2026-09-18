import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Tooltip,
  Marker,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Loader2 } from 'lucide-react';
import { fetchSubCountyMDR, fetchMDRDifference, fetchHotspots } from '../../api/endpoints';
import HotspotDetailPanel from './HotspotDetailPanel';

function MapFocus({ county, features }) {
  const map = useMap();
  const lastFocusedRef = useRef(null);

  useEffect(() => {
    if (!map) return;

    if (!county) {
      if (lastFocusedRef.current !== null) {
        map.setView([-0.5, 37.0], 6);
        lastFocusedRef.current = null;
      }
      return;
    }

    if (lastFocusedRef.current === county) return;
    if (!Array.isArray(features) || features.length === 0) return;

    const points = features
      .map((f) => f.geometry && f.geometry.coordinates)
      .filter((c) => Array.isArray(c) && c.length === 2 && (c[0] !== 0 || c[1] !== 0))
      .map(([lng, lat]) => [lat, lng]);

    if (points.length === 0) return;

    map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 11 });
    lastFocusedRef.current = county;
  }, [county, features, map]);

  return null;
}

function MapResizer() {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 100);
    const handleResize = () => map.invalidateSize();
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', handleResize);
    };
  }, [map]);
  return null;
}

const riskColor = (level) => {
  switch (level) {
    case 'high': return '#DC2626';
    case 'medium': return '#D97706';
    case 'low': return '#059669';
    default: return '#6B7280';
  }
};

const quartileColor = (rate, allRates) => {
  if (rate == null) return '#6B7280';
  const sorted = (allRates || []).filter((r) => r != null).sort((a, b) => a - b);
  if (sorted.length === 0) return '#059669';
  const q = (p) => sorted[Math.floor((sorted.length - 1) * p)];
  if (rate >= q(0.75)) return '#DC2626';
  if (rate >= q(0.50)) return '#D97706';
  if (rate >= q(0.25)) return '#65A30D';
  return '#059669';
};

const OSM_TILE = {
  url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
};

const hotspotColor = (rate) => {
  if (rate >= 50) return '#DC2626';
  if (rate >= 25) return '#D97706';
  return '#059669';
};

const hotspotIcon = (rate) =>
  L.divIcon({
    className: 'amr-hotspot-marker',
    html: `
      <div style="
        width: 18px;
        height: 18px;
        background: ${hotspotColor(rate)};
        border: 2px solid #FFFFFF;
        border-radius: 50%;
        box-shadow: 0 2px 6px rgba(0,0,0,0.4);
      "></div>
    `,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });

export default function CountyChoroplethMap({
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
  const [mapReady, setMapReady] = useState(false);
  const [selectedHotspot, setSelectedHotspot] = useState(null);

  const subCountyParams = (() => {
    const p = new URLSearchParams();
    if (county) p.set('county', county);
    if (startDate) p.set('start_date', startDate);
    if (endDate) p.set('end_date', endDate);
    return p.toString();
  })();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: mode === 'difference'
      ? ['mdr-difference', startMonth, endMonth]
      : ['sub-county-mdr', subCountyParams],
    queryFn: mode === 'difference'
      ? () => fetchMDRDifference(startMonth, endMonth)
      : () => fetchSubCountyMDR(subCountyParams),
    staleTime: 5 * 60 * 1000,
  });

  const { data: hotspotsData } = useQuery({
    queryKey: ['hotspots', startDate, endDate, county, pathogen],
    queryFn: () => fetchHotspots({ start_date: startDate, end_date: endDate, county, pathogen }),
    staleTime: 5 * 60 * 1000,
  });

  // Filter hotspots client-side to the selected county as a defensive layer
  const filteredHotspots = (() => {
    if (!Array.isArray(hotspotsData)) return [];
    if (!county) return hotspotsData;
    const target = String(county).toLowerCase();
    return hotspotsData.filter((h) => {
      const hCounty = String(h.county || '').toLowerCase();
      return hCounty === target || hCounty.includes(target) || target.includes(hCounty);
    });
  })();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const ok = entry.contentRect.width > 0 && entry.contentRect.height > 0;
        setMapReady(ok);
      }
    });
    observer.observe(container);
    const t = setTimeout(() => setMapReady(true), 500);
    return () => {
      observer.disconnect();
      clearTimeout(t);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-[var(--bg-secondary)] min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-teal)]" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-[var(--bg-secondary)] min-h-[400px] text-[var(--status-critical)]">
        Error loading map data: {error?.message}
      </div>
    );
  }

  const features = data?.features || [];
  const hotspots = Array.isArray(hotspotsData) ? hotspotsData : [];

  return (
    <div ref={containerRef} className="h-full w-full relative" style={{ minHeight: 400 }}>
      {!mapReady && (
        <div className="h-full w-full flex items-center justify-center text-[var(--text-muted)] text-sm">
          Loading map...
        </div>
      )}
      {mapReady && (
        <MapContainer
          center={[-0.5, 37.0]}
          zoom={6}
          style={{ height: '100%', width: '100%', background: 'var(--bg-secondary)' }}
          scrollWheelZoom={false}
        >
          <MapResizer />
          <MapFocus county={county} features={features} />
          <TileLayer url={OSM_TILE.url} attribution={OSM_TILE.attribution} />

          {features.map((feature, idx) => {
            const props = feature.properties;
            const [lng, lat] = feature.geometry.coordinates;
            const value = (props.mdr_rate ?? 0) * 100;
            const color = quartileColor(value, features.map((f) => (f.properties?.mdr_rate ?? 0) * 100));

            return (
              <CircleMarker
                key={`circle-${props.county}-${props.sub_county}-${idx}`}
                center={[lat, lng]}
                radius={Math.max(6, Math.min(28, value * 0.35))}
                pathOptions={{ color, fillColor: color, fillOpacity: 0.35, weight: 1.5 }}
                eventHandlers={{ click: () => onCountyClick?.(props) }}
              >
                <Tooltip direction="top" offset={[0, -12]}>
                  <span className="text-xs font-semibold">
                    {props.sub_county} - {value.toFixed(1)}%
                  </span>
                </Tooltip>
              </CircleMarker>
            );
          })}

          {hotspots.map((hotspot) => (
            <Marker
              key={`hotspot-${hotspot.id}`}
              position={[hotspot.latitude, hotspot.longitude]}
              icon={hotspotIcon(hotspot.resistance_rate)}
              eventHandlers={{ click: () => setSelectedHotspot(hotspot) }}
            >
              <Tooltip direction="top" offset={[0, -10]}>
                <span className="text-xs font-semibold">
                  {hotspot.name} - {(hotspot.resistance_rate ?? 0).toFixed(0)}%
                </span>
              </Tooltip>
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

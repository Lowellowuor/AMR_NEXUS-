import { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

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

const OSM_TILE = {
  url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
};

const rateColor = (rate) => {
  if (rate >= 60) return '#DC2626';
  if (rate >= 30) return '#D97706';
  return '#059669';
};

export default function PathogenGeographyMap({ data, onCountyClick, height = 420 }) {
  const points = (data || []).filter((r) => r.latitude != null && r.longitude != null);

  if (points.length === 0) {
    return (
      <div className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-8 text-center">
        <p className="text-sm text-[var(--text-muted)]">
          No coordinates available for this pathogen's counties.
        </p>
      </div>
    );
  }

  const maxSamples = Math.max(...points.map((p) => p.samples), 1);

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--border-primary)] flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
          Geographic distribution
        </h3>
        <div className="flex items-center gap-3 text-[10px] font-medium">
          <span className="inline-flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#059669]" />
            <span className="text-[var(--text-muted)]">&lt; 30%</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#D97706]" />
            <span className="text-[var(--text-muted)]">30–59%</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#DC2626]" />
            <span className="text-[var(--text-muted)]">≥ 60%</span>
          </span>
        </div>
      </div>

      <div style={{ height }} className="w-full">
        <MapContainer
          center={[-0.5, 37.0]}
          zoom={6}
          style={{ height: '100%', width: '100%', background: 'var(--bg-secondary)' }}
          scrollWheelZoom={false}
        >
          <MapResizer />
          <TileLayer url={OSM_TILE.url} attribution={OSM_TILE.attribution} />

          {points.map((row) => {
            const color = rateColor(row.mdr_rate);
            const r = 8 + Math.sqrt(row.samples / maxSamples) * 14;
            return (
              <CircleMarker
                key={row.county}
                center={[row.latitude, row.longitude]}
                radius={r}
                pathOptions={{ color, fillColor: color, fillOpacity: 0.55, weight: 1.5 }}
                eventHandlers={{ click: () => onCountyClick?.(row) }}
              >
                <Tooltip direction="top" offset={[0, -4]}>
                  <div className="text-xs">
                    <strong>{row.county}</strong>
                    <br />
                    MDR {row.mdr_rate}% · n={row.samples}
                  </div>
                </Tooltip>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}

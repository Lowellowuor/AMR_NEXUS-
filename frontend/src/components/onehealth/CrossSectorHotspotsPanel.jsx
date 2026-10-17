import { useQuery } from '@tanstack/react-query';
import { MapPinIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import { Skeleton } from '../ui/Skeleton';
import EmptyState from '../ui/EmptyState';
import { formatNumber, formatPercent } from '../../lib/format';

const SECTOR_COLOUR = {
  human: '#3b82f6',
  animal: '#f59e0b',
  livestock: '#f59e0b',
  poultry: '#f59e0b',
  environment: '#10b981',
};

const CLASS_TONE = {
  Persistent: 'bg-[var(--status-critical-bg)] text-[var(--status-critical)]',
  Emerging: 'bg-[var(--status-warning-bg)] text-[var(--status-warning)]',
  Episodic: 'bg-[var(--status-info-bg)] text-[var(--status-info)]',
  Baseline: 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]',
};

function SectorBar({ sector, samples, mdrRate, totalSamples }) {
  const width = totalSamples > 0 ? (samples / totalSamples) * 100 : 0;
  const colour = SECTOR_COLOUR[sector] || 'var(--accent-teal)';
  return (
    <div
      className="flex items-center gap-2 text-xs"
      title={`${sector}: ${samples} samples, ${mdrRate}% MDR`}
    >
      <span className="w-16 truncate text-[var(--text-secondary)] capitalize">
        {sector}
      </span>
      <div className="flex-1 h-1.5 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${width}%`, backgroundColor: colour }}
        />
      </div>
      <span className="tabular-nums text-[var(--text-muted)] w-10 text-right">
        {samples}
      </span>
      <span className="tabular-nums font-semibold text-[var(--text-primary)] w-12 text-right">
        {formatPercent(mdrRate)}
      </span>
    </div>
  );
}

function HotspotRow({ hotspot }) {
  const classTone = CLASS_TONE[hotspot.classification] || CLASS_TONE.Baseline;
  return (
    <li className="px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-[var(--text-primary)] truncate">
              {hotspot.name}
            </span>
            <span
              className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${classTone}`}
            >
              {hotspot.classification}
            </span>
            <span className="text-[10px] font-medium text-[var(--text-muted)]">
              {hotspot.sectors_present} sectors
            </span>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            {hotspot.county}
            {hotspot.sub_county ? ` · ${hotspot.sub_county}` : ''}
            {hotspot.type ? ` · ${hotspot.type}` : ''}
            {' · '}
            {formatNumber(hotspot.samples)} isolates
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold tabular-nums text-[var(--text-primary)]">
            {formatPercent(hotspot.mdr_rate)}
          </p>
          <p className="text-[10px] text-[var(--text-muted)]">MDR rate</p>
        </div>
      </div>

      <div className="space-y-1">
        {hotspot.sector_breakdown.map((s) => (
          <SectorBar
            key={s.sector}
            sector={s.sector}
            samples={s.samples}
            mdrRate={s.mdr_rate}
            totalSamples={hotspot.samples}
          />
        ))}
      </div>
    </li>
  );
}

export default function CrossSectorHotspotsPanel({ county, limit = 10 }) {
  const params = new URLSearchParams();
  params.set('cross_sector_only', 'true');
  if (county) params.set('county', county);

  const query = useQuery({
    queryKey: ['cross-sector-hotspots', county],
    queryFn: () =>
      api.getHotspotClassification(`${params.toString()}`),
    staleTime: 60_000,
  });

  if (query.isLoading) {
    return (
      <div className="rounded-2xl border border-[var(--border-primary)]/40 bg-[var(--bg-secondary)]/80 p-5">
        <Skeleton className="h-40" />
      </div>
    );
  }

  if (query.isError) return null;

  const hotspots = (query.data ?? []).slice(0, limit);

  if (hotspots.length === 0) {
    return (
      <div className="rounded-2xl border border-[var(--border-primary)]/40 bg-[var(--bg-secondary)]/80 p-5">
        <EmptyState
          title="No cross-sector hotspots"
          description="No active hotspot currently has isolates spanning two or more One Health pillars."
          icon={MapPinIcon}
        />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[var(--border-primary)]/40 bg-[var(--bg-secondary)]/80 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-[var(--border-primary)]/40">
        <div>
          <h2 className="text-base font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <MapPinIcon className="w-4 h-4 text-[var(--accent-teal)]" />
            Cross-sector hotspots
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Hotspots where isolates span two or more One Health pillars
          </p>
        </div>
        <Link
          to="/hotspots"
          className="text-xs text-[var(--accent-teal)] hover:underline inline-flex items-center gap-1"
        >
          All hotspots
          <ArrowRightIcon className="w-3 h-3" />
        </Link>
      </div>

      <ul className="divide-y divide-[var(--border-primary)]/30">
        {hotspots.map((h) => (
          <HotspotRow key={h.id} hotspot={h} />
        ))}
      </ul>

      {query.data.length > limit && (
        <div className="px-4 py-2 bg-[var(--bg-primary)]/40 border-t border-[var(--border-primary)]/40 text-[10px] text-[var(--text-muted)] text-center">
          Showing {limit} of {query.data.length} cross-sector hotspots
        </div>
      )}
    </div>
  );
}
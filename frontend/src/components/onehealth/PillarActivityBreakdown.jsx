import { useQuery } from '@tanstack/react-query';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';
import api from '../../api/client';
import { Skeleton } from '../ui/Skeleton';
import { formatNumber, formatPercent } from '../../lib/format';

const SECTOR_COLOUR = {
  human: '#3b82f6',
  poultry: '#f59e0b',
  livestock: '#d97706',
  environment: '#10b981',
};

function rateTone(rate) {
  if (rate >= 50) return 'text-[var(--status-critical)]';
  if (rate >= 30) return 'text-[var(--status-warning)]';
  return 'text-[var(--status-success)]';
}

function SectorRow({ sector }) {
  const [open, setOpen] = useState(false);
  const colour = SECTOR_COLOUR[sector.sector] || 'var(--accent-teal)';

  return (
    <div className="border-b border-[var(--border-primary)]/30 last:border-b-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-tertiary)]/30 text-left"
      >
        {open ? (
          <ChevronDownIcon className="w-4 h-4 text-[var(--text-muted)]" />
        ) : (
          <ChevronRightIcon className="w-4 h-4 text-[var(--text-muted)]" />
        )}
        <span
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: colour }}
        />
        <span className="text-sm font-medium text-[var(--text-primary)] capitalize">
          {sector.sector}
        </span>
        <span className="ml-auto flex items-center gap-4 text-xs">
          <span className="text-[var(--text-muted)] tabular-nums">
            {formatNumber(sector.samples)} isolates
          </span>
          <span className={`tabular-nums font-semibold ${rateTone(sector.mdr_rate)}`}>
            {formatPercent(sector.mdr_rate)} MDR
          </span>
        </span>
      </button>
      {open && (
        <div className="bg-[var(--bg-primary)]/30 border-t border-[var(--border-primary)]/30">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left border-b border-[var(--border-primary)]/20">
                <th className="px-4 py-2 font-medium text-[var(--text-muted)]">Sub-sector</th>
                <th className="px-4 py-2 font-medium text-[var(--text-muted)] text-right">Samples</th>
                <th className="px-4 py-2 font-medium text-[var(--text-muted)] text-right">MDR rate</th>
              </tr>
            </thead>
            <tbody>
              {sector.sub_sectors.map((s) => (
                <tr key={s.sub_sector} className="border-b border-[var(--border-primary)]/10">
                  <td className="px-4 py-1.5 text-[var(--text-secondary)] capitalize">
                    {s.sub_sector}
                  </td>
                  <td className="px-4 py-1.5 text-right tabular-nums text-[var(--text-primary)]">
                    {formatNumber(s.samples)}
                  </td>
                  <td className={`px-4 py-1.5 text-right tabular-nums font-medium ${rateTone(s.mdr_rate)}`}>
                    {formatPercent(s.mdr_rate)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function PillarActivityBreakdown() {
  const query = useQuery({
    queryKey: ['onehealth-pillar-activity'],
    queryFn: () => api.getOneHealthPillarActivity(),
    staleTime: 60_000,
  });

  if (query.isLoading) {
    return (
      <div className="rounded-2xl border border-[var(--border-primary)]/40 bg-[var(--bg-secondary)]/80 p-5">
        <Skeleton className="h-40" />
      </div>
    );
  }

  if (query.isError || !query.data) return null;

  const data = query.data;

  return (
    <div className="rounded-2xl border border-[var(--border-primary)]/40 bg-[var(--bg-secondary)]/80 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-primary)]/40">
        <div>
          <h2 className="text-base font-semibold text-[var(--text-primary)]">
            Pillar activity
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            {formatNumber(data.total_isolates)} isolates across {data.sector_count} sectors ·{' '}
            {data.window_days} days
          </p>
        </div>
        <span className="text-xs text-[var(--text-muted)]">
          Click a sector to expand
        </span>
      </div>
      <div>
        {data.sectors.map((s) => (
          <SectorRow key={s.sector} sector={s} />
        ))}
      </div>
    </div>
  );
}
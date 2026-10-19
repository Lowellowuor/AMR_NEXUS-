import { useQuery } from '@tanstack/react-query';
import { BeakerIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import api from '../../api/client';
import { Skeleton } from '../ui/Skeleton';
import { formatNumber, formatPercent } from '../../lib/format';

export default function AmuResistancePanel() {
  const query = useQuery({
    queryKey: ['onehealth-amu-resistance'],
    queryFn: () => api.getOneHealthAmuResistance(),
    staleTime: 60_000,
  });

  if (query.isLoading) {
    return (
      <div className="rounded-2xl border border-[var(--border-primary)]/40 bg-[var(--bg-secondary)]/80 p-5">
        <Skeleton className="h-32" />
      </div>
    );
  }

  if (query.isError || !query.data) return null;

  const data = query.data;
  const sectorsWithData = data.sectors.filter((s) => s.resistance_samples > 0);

  return (
    <div className="rounded-2xl border border-[var(--border-primary)]/40 bg-[var(--bg-secondary)]/80 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border-primary)]/40">
        <BeakerIcon className="w-4 h-4 text-[var(--text-muted)]" />
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">
          AMU ↔ resistance
        </h2>
        <span className="ml-auto text-xs text-[var(--text-muted)]">
          {data.window_days} days
        </span>
      </div>

      <table className="w-full text-xs">
        <thead>
          <tr className="text-left border-b border-[var(--border-primary)]/20 bg-[var(--bg-primary)]/30">
            <th className="px-4 py-2 font-medium text-[var(--text-muted)]">Sector</th>
            <th className="px-4 py-2 font-medium text-[var(--text-muted)] text-right">AMU records</th>
            <th className="px-4 py-2 font-medium text-[var(--text-muted)] text-right">Resistance samples</th>
            <th className="px-4 py-2 font-medium text-[var(--text-muted)] text-right">MDR rate</th>
            <th className="px-4 py-2 font-medium text-[var(--text-muted)]">Correlation</th>
          </tr>
        </thead>
        <tbody>
          {data.sectors.map((s) => (
            <tr key={s.sector} className="border-b border-[var(--border-primary)]/10">
              <td className="px-4 py-2 text-[var(--text-primary)] capitalize">
                {s.sector}
              </td>
              <td className="px-4 py-2 text-right tabular-nums text-[var(--text-secondary)]">
                {formatNumber(s.amu_records)}
              </td>
              <td className="px-4 py-2 text-right tabular-nums text-[var(--text-secondary)]">
                {formatNumber(s.resistance_samples)}
              </td>
              <td className="px-4 py-2 text-right tabular-nums font-medium text-[var(--text-primary)]">
                {formatPercent(s.mdr_rate)}
              </td>
              <td className="px-4 py-2">
                {s.has_both ? (
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--status-success-bg)] text-[var(--status-success)]">
                    available
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-muted)]">
                    insufficient
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {data.sectors_with_both === 0 && (
        <div className="px-4 py-3 bg-[var(--status-info-bg)]/20 border-t border-[var(--border-primary)]/30 flex items-start gap-2">
          <InformationCircleIcon className="w-4 h-4 text-[var(--status-info)] flex-shrink-0 mt-0.5" />
          <div className="text-xs text-[var(--text-secondary)] leading-relaxed">
            <p className="font-medium text-[var(--text-info)] mb-1">
              Correlation not yet computable
            </p>
            <p>
              {sectorsWithData.length === 0
                ? 'No AMU records in this window. Submit antimicrobial consumption data per sector to enable correlation analysis.'
                : `AMU data exists for ${sectorsWithData.length} sector${sectorsWithData.length === 1 ? '' : 's'} but not across 2+ sectors. Collect AMU records for additional sectors to compute correlation.`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
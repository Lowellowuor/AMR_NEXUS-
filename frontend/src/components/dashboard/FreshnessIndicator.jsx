import { useQuery } from '@tanstack/react-query';
import { Clock, AlertTriangle } from 'lucide-react';
import { getFreshness } from '../../api/endpoints';
import { timeAgo, formatNumber } from '../../lib/format';

export default function FreshnessIndicator() {
  const { data } = useQuery({
    queryKey: ['freshness'],
    queryFn: getFreshness,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  if (!data) return null;

  const last = data.last_submission ? new Date(data.last_submission) : null;
  const staleHours = last ? (Date.now() - last.getTime()) / 3600000 : null;
  const isStale = staleHours != null && staleHours > 48;

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium ${
        isStale
          ? 'bg-[var(--status-warning-bg)] border-[var(--status-warning-border)] text-[var(--status-warning)]'
          : 'bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--text-secondary)]'
      }`}
      title={last ? last.toLocaleString('en-KE', { timeZone: 'Africa/Nairobi' }) : ''}
    >
      {isStale ? <AlertTriangle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
      <span>
        {last ? (
          <>
            Last submission {timeAgo(data.last_submission)}
            <span className="text-[var(--text-muted)] ml-2">
               -  {formatNumber(data.total_records)} total
            </span>
          </>
        ) : (
          'No submissions yet'
        )}
      </span>
    </div>
  );
}

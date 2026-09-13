import { MapPinIcon } from '@heroicons/react/24/outline';
import { Card } from '../../design-system';
import EmptyState from '../ui/EmptyState';
import { formatPercent } from '../../lib/format';

export default function TopCounties({ counties }) {
  return (
    <Card className="p-5">
      <h3 className="text-md font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
        <MapPinIcon className="h-5 w-5 text-[var(--accent-teal)]" />
        Top Counties by MDR Rate
      </h3>
      {!counties || counties.length === 0 ? (
        <EmptyState
          icon={MapPinIcon}
          title="No county data yet"
          description="Counties will appear here once isolates are recorded."
        />
      ) : (
        <div className="space-y-3">
          {counties.map((item, idx) => (
            <div key={item.county}>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium text-[var(--text-secondary)]">
                  {idx + 1}. {item.county}
                </span>
                <span className="font-bold text-[var(--accent-teal)] tabular-nums">
                  {formatPercent(item.rate)}
                </span>
              </div>
              <div className="w-full bg-[var(--bg-tertiary)] rounded-full h-1.5">
                <div
                  className="bg-[var(--accent-teal)] h-1.5 rounded-full transition-all"
                  style={{ width: `${Math.min(item.rate ?? 0, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

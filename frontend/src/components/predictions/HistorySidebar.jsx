import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Clock, ChevronRight } from 'lucide-react';
import api from '../../api/client';
import EmptyState from '../ui/EmptyState';
import { timeAgo } from '../../lib/format';

export default function HistorySidebar({ onSelect }) {
  const { data, isLoading } = useQuery({
    queryKey: ['predict-recent'],
    queryFn: () => api.getPredictions(5, 0),
    staleTime: 30_000,
  });

  const predictions = Array.isArray(data) ? data : data?.records ?? [];

  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] shadow-[var(--shadow-sm)] overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border-primary)]">
        <Clock className="w-4 h-4 text-[var(--text-muted)]" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Recent predictions
        </h3>
      </div>

      <div className="p-2">
        {isLoading ? (
          <div className="space-y-2 p-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 rounded-lg bg-[var(--bg-tertiary)] animate-pulse" />
            ))}
          </div>
        ) : predictions.length === 0 ? (
          <EmptyState
            icon={Clock}
            title="No predictions yet"
            description="Your recent predictions will appear here."
            className="py-6"
          />
        ) : (
          <ul className="space-y-1">
            {predictions.map((p) => (
              <li key={p.record_id}>
                <button
                  onClick={() => onSelect?.(p)}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition group flex items-center justify-between gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-medium text-[var(--text-primary)] truncate">
                        {p.pathogen_code || 'Unnamed isolate'}
                      </span>
                      {p.mdr_flag && (
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--status-critical)] flex-shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                      <span className="truncate">{p.county || '-'}</span>
                      <span> - </span>
                      <span className="flex-shrink-0">{timeAgo(p.timestamp)}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition flex-shrink-0" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { FolderIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import api from '../api/client';
import { Skeleton } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import { formatNumber, formatPercent } from '../lib/format';
import { usePageTitle } from '../hooks/usePageTitle';

const STATUS_TONE = {
  open: 'bg-[var(--status-info-bg)] text-[var(--status-info)]',
  closed: 'bg-[var(--bg-tertiary)] text-[var(--text-muted)]',
};

export default function Cases() {
  usePageTitle('Cases');
  const [county, setCounty] = useState('');
  const [status, setStatus] = useState('');
  const [sector, setSector] = useState('');

  const params = useMemo(() => {
    const p = new URLSearchParams();
    if (county) p.set('county', county);
    if (status) p.set('status', status);
    if (sector) p.set('sector', sector);
    return p.toString();
  }, [county, status, sector]);

  const query = useQuery({
    queryKey: ['cases', params],
    queryFn: () => api.getCases(params),
    staleTime: 30_000,
  });

  const cases = query.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">Cases</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            Isolates grouped into cases by county, sector, site and time window.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border-primary)]/40 bg-[var(--bg-secondary)]/80 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input
              type="text"
              value={county}
              onChange={(e) => setCounty(e.target.value)}
              placeholder="County"
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-[var(--bg-primary)] border border-[var(--border-primary)]/40 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-teal)]"
            />
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg bg-[var(--bg-primary)] border border-[var(--border-primary)]/40 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-teal)]"
          >
            <option value="">All statuses</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </select>
          <select
            value={sector}
            onChange={(e) => setSector(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg bg-[var(--bg-primary)] border border-[var(--border-primary)]/40 text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-teal)]"
          >
            <option value="">All sectors</option>
            <option value="human">Human</option>
            <option value="animal">Animal</option>
            <option value="environment">Environment</option>
          </select>
          <div className="flex items-center justify-end text-xs text-[var(--text-muted)]">
            {cases.length} case{cases.length === 1 ? '' : 's'}
          </div>
        </div>
      </div>

      {query.isLoading ? (
        <Skeleton className="h-64" />
      ) : cases.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border-primary)]/40 bg-[var(--bg-secondary)]/80 p-6">
          <EmptyState
            title="No cases yet"
            description="Cases form automatically when isolates share enough signals to group safely."
            icon={FolderIcon}
          />
        </div>
      ) : (
        <div className="rounded-2xl border border-[var(--border-primary)]/40 bg-[var(--bg-secondary)]/80 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-[var(--border-primary)]/40 bg-[var(--bg-primary)]/40">
                <th className="px-4 py-3 font-medium text-[var(--text-muted)]">Case</th>
                <th className="px-4 py-3 font-medium text-[var(--text-muted)]">County</th>
                <th className="px-4 py-3 font-medium text-[var(--text-muted)]">Sector</th>
                <th className="px-4 py-3 font-medium text-[var(--text-muted)] text-right">Isolates</th>
                <th className="px-4 py-3 font-medium text-[var(--text-muted)] text-right">MDR rate</th>
                <th className="px-4 py-3 font-medium text-[var(--text-muted)]">Status</th>
                <th className="px-4 py-3 font-medium text-[var(--text-muted)]">Latest</th>
              </tr>
            </thead>
            <tbody>
              {cases.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-[var(--border-primary)]/20 hover:bg-[var(--bg-primary)]/40"
                >
                  <td className="px-4 py-3">
                    <Link
                      to={`/cases/${c.id}`}
                      className="font-medium text-[var(--accent-teal)] hover:underline tabular-nums"
                    >
                      {c.case_code}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">
                    {c.county}
                    {c.sub_county ? ` · ${c.sub_county}` : ''}
                  </td>
                  <td className="px-4 py-3 text-[var(--text-secondary)] capitalize">
                    {c.sector || '—'}
                    {c.species ? ` · ${c.species}` : ''}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-[var(--text-primary)]">
                    {formatNumber(c.isolate_count)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-[var(--text-primary)]">
                    {formatPercent(c.mdr_rate)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        STATUS_TONE[c.status] || STATUS_TONE.closed
                      }`}
                    >
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                    {c.latest_isolate_at
                      ? new Date(c.latest_isolate_at).toLocaleDateString()
                      : '—'}
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
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChartBarIcon, BeakerIcon, MapPinIcon, TagIcon, PlusIcon } from '@heroicons/react/24/outline';
import { usePageTitle } from '../hooks/usePageTitle';
import api from '../api/client';
import { Skeleton } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import DrugForm from '../components/amu/DrugForm';
import ConsumptionForm from '../components/amu/ConsumptionForm';
import { useAuth } from '../contexts/AuthContext';

const DIMENSIONS = [
  { value: 'sector', label: 'Sector' },
  { value: 'county', label: 'County' },
  { value: 'species', label: 'Species' },
  { value: 'drug', label: 'Drug' },
];

function StatCard({ label, value, sublabel, icon: Icon }) {
  return (
    <div className="bg-[var(--bg-secondary)]/80 p-5 rounded-2xl">
      <div className="flex items-center gap-2 mb-2">
        {Icon ? <Icon className="h-5 w-5 text-[var(--accent-teal)]" /> : null}
        <p className="text-sm text-[var(--text-muted)]">{label}</p>
      </div>
      <p className="text-2xl font-bold text-[var(--text-primary)]">{value ?? '—'}</p>
      {sublabel ? (
        <p className="text-xs text-[var(--text-muted)] mt-1">{sublabel}</p>
      ) : null}
    </div>
  );
}

function SummaryBar({ quantity, max }) {
  const pct = max > 0 ? Math.max((quantity / max) * 100, 2) : 0;
  return (
    <div className="w-full bg-[var(--border-primary)]/60 rounded-full h-2">
      <div
        className="bg-[var(--accent-teal)] h-2 rounded-full"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export default function AmuDashboard() {
  usePageTitle('Antimicrobial Use');
  const [dimension, setDimension] = useState('sector');
  const [showDrugForm, setShowDrugForm] = useState(false);
  const [showConsumptionForm, setShowConsumptionForm] = useState(false);
  const { user } = useAuth();
  const qc = useQueryClient();
  const canManage = user?.role === 'admin' || user?.role === 'analyst';


  const summary = useQuery({
    queryKey: ['amu', 'summary', dimension],
    queryFn: () => api.getAmuSummary(dimension),
  });

  const trend = useQuery({
    queryKey: ['amu', 'trend'],
    queryFn: () => api.getAmuTrend(),
  });

  const topDrugs = useQuery({
    queryKey: ['amu', 'top-drugs'],
    queryFn: () => api.getAmuTopDrugs('limit=10'),
  });

  const drugs = useQuery({
    queryKey: ['amu', 'drugs'],
    queryFn: () => api.getAmuDrugs(),
  });

  const createDrugMutation = useMutation({
    mutationFn: (payload) => api.createAmuDrug(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['amu', 'drugs'] });
      setShowDrugForm(false);
    },
  });

  const createConsumptionMutation = useMutation({
    mutationFn: (payload) => api.createAmuConsumption(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['amu'] });
      setShowConsumptionForm(false);
    },
  });

  const totals = summary.data ?? { total_quantity: 0, total_records: 0, buckets: [] };
  const maxBucketQty = Math.max(0, ...(totals.buckets || []).map((b) => b.quantity || 0));
  const topDrugsList = topDrugs.data?.items ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            Antimicrobial Use &amp; Consumption
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Consumption records across human, animal, and environment sectors.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={dimension}
            onChange={(e) => setDimension(e.target.value)}
            className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-full px-4 py-2 text-sm"
          >
            {DIMENSIONS.map((d) => (
              <option key={d.value} value={d.value}>
                Group by {d.label}
              </option>
            ))}
          </select>
          {canManage && (
            <>
              <button
                type="button"
                onClick={() => setShowDrugForm(true)}
                className="flex items-center gap-1 px-4 py-2 rounded-full text-sm border border-[var(--border-primary)] hover:bg-[var(--bg-tertiary)]/60"
              >
                <PlusIcon className="h-4 w-4" />
                Drug
              </button>
              <button
                type="button"
                onClick={() => setShowConsumptionForm(true)}
                className="flex items-center gap-1 px-4 py-2 rounded-full text-sm bg-[var(--accent-teal)] text-white"
              >
                <PlusIcon className="h-4 w-4" />
                Consumption
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          label="Total quantity"
          value={summary.isLoading ? '…' : totals.total_quantity.toLocaleString()}
          sublabel="across all units"
          icon={BeakerIcon}
        />
        <StatCard
          label="Records"
          value={summary.isLoading ? '…' : totals.total_records}
          sublabel="consumption events"
          icon={ChartBarIcon}
        />
        <StatCard
          label="Drugs tracked"
          value={drugs.isLoading ? '…' : (drugs.data?.length ?? 0)}
          sublabel="reference list"
          icon={TagIcon}
        />
        <StatCard
          label="Buckets"
          value={summary.isLoading ? '…' : (totals.buckets?.length ?? 0)}
          sublabel={`grouped by ${dimension}`}
          icon={MapPinIcon}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[var(--bg-secondary)]/80 p-5 rounded-2xl">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
            By {dimension}
          </h2>
          {summary.isLoading ? (
            <Skeleton />
          ) : totals.buckets.length === 0 ? (
            <EmptyState
              title="No consumption data yet"
              description="Once AMU records are submitted, they will appear here."
            />
          ) : (
            <div className="space-y-3">
              {totals.buckets.slice(0, 10).map((b) => (
                <div key={b.key} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--text-primary)] truncate max-w-[70%]">
                      {b.key || 'Unknown'}
                    </span>
                    <span className="text-[var(--text-muted)] tabular-nums">
                      {b.quantity.toLocaleString()} ({b.records})
                    </span>
                  </div>
                  <SummaryBar quantity={b.quantity} max={maxBucketQty} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-[var(--bg-secondary)]/80 p-5 rounded-2xl">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
            Top drugs by quantity
          </h2>
          {topDrugs.isLoading ? (
            <Skeleton />
          ) : topDrugsList.length === 0 ? (
            <EmptyState
              title="No drug data yet"
              description="Add drugs and consumption records to see rankings."
            />
          ) : (
            <ul className="space-y-2">
              {topDrugsList.map((d, i) => (
                <li
                  key={d.drug_id}
                  className="flex items-center justify-between text-sm border-b border-[var(--border-primary)]/40 last:border-b-0 pb-2 last:pb-0"
                >
                  <span className="text-[var(--text-primary)]">
                    <span className="text-[var(--text-muted)] mr-2">{i + 1}.</span>
                    {d.name}
                  </span>
                  <span className="text-[var(--text-muted)] tabular-nums">
                    {d.quantity.toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="bg-[var(--bg-secondary)]/80 p-5 rounded-2xl">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
          Monthly trend
        </h2>
        {trend.isLoading ? (
          <Skeleton />
        ) : !trend.data?.points?.length ? (
          <EmptyState
            title="No trend data yet"
            description="Consumption events with periods will build the trend."
          />
        ) : (
          <div className="space-y-2">
            {trend.data.points.slice(-24).map((p) => (
              <div key={p.period} className="flex items-center gap-3 text-sm">
                <span className="w-20 text-[var(--text-muted)] tabular-nums">
                  {p.period}
                </span>
                <div className="flex-1">
                  <SummaryBar
                    quantity={p.quantity}
                    max={Math.max(...trend.data.points.map((x) => x.quantity || 0))}
                  />
                </div>
                <span className="w-24 text-right text-[var(--text-primary)] tabular-nums">
                  {p.quantity.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <DrugForm
        open={showDrugForm}
        busy={createDrugMutation.isPending}
        onClose={() => setShowDrugForm(false)}
        onSubmit={(payload) => createDrugMutation.mutate(payload)}
      />
      <ConsumptionForm
        open={showConsumptionForm}
        drugs={drugs.data ?? []}
        busy={createConsumptionMutation.isPending}
        onClose={() => setShowConsumptionForm(false)}
        onSubmit={(payload) => createConsumptionMutation.mutate(payload)}
      />
    </div>
  );
}
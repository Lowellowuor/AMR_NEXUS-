import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BeakerIcon,
  ShieldExclamationIcon,
  ExclamationTriangleIcon,
  GlobeAltIcon,
  InformationCircleIcon,
  ArrowTrendingUpIcon,
  LightBulbIcon,
  BuildingOffice2Icon,
} from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import { usePageTitle } from '../hooks/usePageTitle';
import api from '../api/client';
import { Skeleton } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import { formatNumber, formatPercent } from '../lib/format';

const RANGE_OPTIONS = [
  { value: 30, label: 'Last 30 days' },
  { value: 90, label: 'Last 90 days' },
  { value: 180, label: 'Last 6 months' },
  { value: 365, label: 'Last 12 months' },
];

function FactorCard({ title, subtitle, children, tone }) {
  return (
    <div
      className={`rounded-2xl border p-5 ${
        tone === 'warn'
          ? 'border-[var(--status-warning-border)] bg-[var(--status-warning-bg)]/10'
          : 'border-[var(--border-primary)]/40 bg-[var(--bg-secondary)]/80'
      }`}
    >
      <p className="text-sm font-semibold text-[var(--text-primary)]">
        {title}
      </p>
      {subtitle && (
        <p className="text-xs text-[var(--text-muted)] mt-1">{subtitle}</p>
      )}
      <div className="mt-4">{children}</div>
    </div>
  );
}

function PressureRow({ label, value, rate, n, max }) {
  const width = max > 0 ? Math.max((value / max) * 100, 3) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-[var(--text-primary)] truncate max-w-[55%]">
          {label}
        </span>
        <span className="text-[var(--text-muted)] tabular-nums text-xs">
          {formatNumber(n)} · {formatPercent(rate)}
        </span>
      </div>
      <div className="w-full h-2 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
        <div
          className="h-full rounded-full bg-[var(--accent-teal)]"
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

export default function RootCauses() {
  usePageTitle('Contributing Factors');
  const [days, setDays] = useState(180);
  const [county, setCounty] = useState('');

  const optionsQuery = useQuery({
    queryKey: ['rc-options'],
    queryFn: () => api.getOptions(),
    staleTime: 10 * 60 * 1000,
  });

  const params = new URLSearchParams();
  params.set('days', String(days));
  if (county) params.set('county', county);

  const query = useQuery({
    queryKey: ['root-cause-factors', days, county],
    queryFn: () => api.getRootCauseFactors(params.toString()),
    staleTime: 5 * 60 * 1000,
  });

  const data = query.data;
  const counties = optionsQuery.data?.counties ?? [];

  const maxPathogen = Math.max(0, ...(data?.pathogen_pressure ?? []).map((p) => p.samples));
  const maxSpecimen = Math.max(0, ...(data?.specimen_pressure ?? []).map((p) => p.samples));
  const maxShap = Math.max(0, ...(data?.shap_features ?? []).map((p) => p.count));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            Contributing Factors
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1 max-w-3xl">
            What the data shows is most associated with resistance in the
            selected scope. Structured against WHO GLASS and One Health
            frameworks.
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={county}
            onChange={(e) => setCounty(e.target.value)}
            className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-full px-4 py-2 text-sm"
          >
            <option value="">All counties</option>
            {counties.map((c) => (
              <option key={c.code || c} value={c.code || c}>
                {c.name || c}
              </option>
            ))}
          </select>
          <select
            value={days}
            onChange={(e) => setDays(parseInt(e.target.value, 10))}
            className="bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-full px-4 py-2 text-sm"
          >
            {RANGE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Honest disclaimer — visible up top, not buried */}
      <div className="flex items-start gap-3 rounded-2xl border border-[var(--status-info-border)]/40 bg-[var(--status-info-bg)]/10 p-4">
        <InformationCircleIcon className="w-5 h-5 text-[var(--status-info)] flex-shrink-0 mt-0.5" />
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          <strong className="text-[var(--text-primary)]">This page surfaces contributing factors, not proven causes.</strong>{' '}
          Causal attribution requires clinical outcome data and controlled
          study design. What follows is what the current data shows is
          associated with resistance patterns. Treat it as a prompt for
          investigation, not a conclusion.
        </p>
      </div>

      {query.isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      ) : query.isError ? (
        <EmptyState
          icon={ExclamationTriangleIcon}
          title="Could not load contributing factors"
          description={query.error?.message || 'Try adjusting the scope or refreshing.'}
        />
      ) : !data || (data.scope?.samples ?? 0) === 0 ? (
        <EmptyState
          icon={BeakerIcon}
          title="No isolates in this scope"
          description="Widen the period or remove the county filter."
        />
      ) : (
        <>
          {/* Scope summary */}
          <div className="rounded-2xl bg-[var(--bg-secondary)]/80 p-5">
            <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
              Scope
            </p>
            <p className="text-lg text-[var(--text-primary)] mt-1">
              <span className="font-bold tabular-nums">
                {formatNumber(data.scope.samples)}
              </span>{' '}
              isolates over{' '}
              <span className="font-bold">{data.scope.days}</span> days
              {data.scope.county ? ` in ${data.scope.county}` : ' nationally'}.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Pathogen pressure */}
            <FactorCard
              title="Pathogen pressure"
              subtitle="Which organisms dominate the sample volume"
            >
              <div className="space-y-3">
                {data.pathogen_pressure.slice(0, 6).map((p) => (
                  <PressureRow
                    key={p.code}
                    label={p.code}
                    value={p.samples}
                    rate={p.mdr_rate}
                    n={p.samples}
                    max={maxPathogen}
                  />
                ))}
              </div>
            </FactorCard>

            {/* Sector pressure */}
            <FactorCard
              title="Sector pressure"
              subtitle="Which sectors show the highest resistance"
              tone={
                (data.sector_pressure[0]?.mdr_rate ?? 0) >= 40 ? 'warn' : null
              }
            >
              <div className="space-y-3">
                {data.sector_pressure.map((s) => (
                  <div
                    key={s.sector}
                    className="flex items-center justify-between text-sm border-b border-[var(--border-primary)]/40 last:border-b-0 pb-2 last:pb-0"
                  >
                    <span className="text-[var(--text-primary)] capitalize">
                      {s.sector}
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="text-[var(--text-muted)] text-xs tabular-nums">
                        n={formatNumber(s.samples)}
                      </span>
                      <span
                        className={`font-semibold tabular-nums ${
                          s.mdr_rate >= 50
                            ? 'text-[var(--status-critical)]'
                            : s.mdr_rate >= 30
                            ? 'text-[var(--status-warning)]'
                            : 'text-[var(--status-success)]'
                        }`}
                      >
                        {formatPercent(s.mdr_rate)}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            </FactorCard>

            {/* Specimen pressure */}
            <FactorCard
              title="Specimen pressure"
              subtitle="Which sample types carry the most resistance"
            >
              <div className="space-y-3">
                {data.specimen_pressure.slice(0, 6).map((s) => (
                  <PressureRow
                    key={s.specimen}
                    label={s.specimen}
                    value={s.samples}
                    rate={s.mdr_rate}
                    n={s.samples}
                    max={maxSpecimen}
                  />
                ))}
              </div>
            </FactorCard>

            {/* Alert pressure */}
            <FactorCard
              title="Alert pressure"
              subtitle="Anomalies flagged in this scope"
              tone={data.alert_pressure.anomaly_rate >= 10 ? 'warn' : null}
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
                    Anomalies
                  </p>
                  <p className="text-2xl font-bold tabular-nums text-[var(--text-primary)] mt-1">
                    {formatNumber(data.alert_pressure.anomaly_flagged)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-[var(--text-muted)]">
                    Anomaly rate
                  </p>
                  <p
                    className={`text-2xl font-bold tabular-nums mt-1 ${
                      data.alert_pressure.anomaly_rate >= 10
                        ? 'text-[var(--status-warning)]'
                        : 'text-[var(--text-primary)]'
                    }`}
                  >
                    {formatPercent(data.alert_pressure.anomaly_rate)}
                  </p>
                </div>
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-4">
                A high anomaly rate suggests either genuinely unusual events,
                incomplete reporting, or shifts in case mix. Investigate
                before acting.
              </p>
            </FactorCard>
          </div>

          {/* SHAP features */}
          <FactorCard
            title="What the model relies on"
            subtitle="Aggregate of the most influential features across recent predictions"
          >
            {data.shap_features.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">
                No prediction SHAP data available for this scope.
              </p>
            ) : (
              <div className="space-y-3">
                {data.shap_features.map((f) => (
                  <PressureRow
                    key={f.feature}
                    label={f.feature}
                    value={f.count}
                    rate={f.mean_abs_shap * 100}
                    n={f.count}
                    max={maxShap}
                  />
                ))}
                <p className="text-xs text-[var(--text-muted)] pt-2">
                  Frequency (how often a feature appears as the top driver)
                  combined with its mean absolute SHAP contribution.
                </p>
              </div>
            )}
          </FactorCard>

          {/* WHO GLASS priority pathogens context */}
          <FactorCard
            title="WHO GLASS priority context"
            subtitle="How the observed pathogens compare to internationally recognised priorities"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                  GLASS priority pathogens
                </p>
                <ul className="space-y-1.5 text-sm">
                  {data.frameworks.glass_priority_pathogens.map((p) => (
                    <li
                      key={p}
                      className="flex items-center gap-2 text-[var(--text-secondary)]"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-teal)] flex-shrink-0" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                  Priority specimens
                </p>
                <ul className="space-y-1.5 text-sm">
                  {data.frameworks.glass_priority_specimens.map((p) => (
                    <li
                      key={p}
                      className="flex items-center gap-2 text-[var(--text-secondary)]"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-teal)] flex-shrink-0" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </FactorCard>

          {/* One Health feedback loops */}
          <FactorCard
            title="One Health feedback loops"
            subtitle="Established drivers of AMR in East Africa, from participatory systems analysis"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {data.frameworks.one_health_feedback_loops.map((loop) => (
                <div
                  key={loop}
                  className="flex items-start gap-3 rounded-xl border border-[var(--border-primary)]/40 bg-[var(--bg-primary)]/40 p-3"
                >
                  <GlobeAltIcon className="w-4 h-4 text-[var(--accent-teal)] flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-[var(--text-secondary)]">
                    {loop}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-4">
              These are the recurring systemic dynamics documented in the
              literature. Where your data shows high pressure on multiple
              domains at once, interventions targeting these loops are most
              likely to move the needle.
            </p>
          </FactorCard>

          {/* Intervention points */}
          <FactorCard
            title="Where intervention is most likely to help"
            subtitle="Evidence-backed leverage points from the AMR systems literature"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {data.frameworks.intervention_points.map((point) => (
                <div
                  key={point}
                  className="flex items-start gap-3 rounded-xl border border-[var(--border-primary)]/40 bg-[var(--bg-primary)]/40 p-3"
                >
                  <LightBulbIcon className="w-4 h-4 text-[var(--status-warning)] flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-[var(--text-secondary)]">
                    {point}
                  </span>
                </div>
              ))}
            </div>
          </FactorCard>

          {/* Suggested next steps */}
          <div className="rounded-2xl border border-[var(--border-primary)]/40 bg-[var(--bg-secondary)]/60 p-5">
            <h3 className="text-base font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
              <ArrowTrendingUpIcon className="w-5 h-5 text-[var(--accent-teal)]" />
              Where to drill in next
            </h3>
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              Each factor domain above maps to a page where you can investigate
              further.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link
                to="/amu"
                className="inline-flex items-center gap-1 text-sm px-4 py-2 rounded-full border border-[var(--border-primary)] hover:bg-[var(--bg-tertiary)]/60"
              >
                <BuildingOffice2Icon className="w-3.5 h-3.5" />
                Antimicrobial Use
              </Link>
              <Link
                to="/history?sector=animal"
                className="inline-flex items-center gap-1 text-sm px-4 py-2 rounded-full border border-[var(--border-primary)] hover:bg-[var(--bg-tertiary)]/60"
              >
                Veterinary records
              </Link>
              <Link
                to="/alerts"
                className="inline-flex items-center gap-1 text-sm px-4 py-2 rounded-full border border-[var(--border-primary)] hover:bg-[var(--bg-tertiary)]/60"
              >
                <ShieldExclamationIcon className="w-3.5 h-3.5" />
                Alerts
              </Link>
              <Link
                to="/one-health"
                className="inline-flex items-center gap-1 text-sm px-4 py-2 rounded-full border border-[var(--border-primary)] hover:bg-[var(--bg-tertiary)]/60"
              >
                <GlobeAltIcon className="w-3.5 h-3.5" />
                One Health Overview
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
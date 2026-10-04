import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  BeakerIcon,
  SparklesIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  PrinterIcon,
} from '@heroicons/react/24/outline';
import { usePageTitle } from '../hooks/usePageTitle';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/client';
import { Skeleton } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import { formatPercent } from '../lib/format';

const COMMON_PATTERNS = [
  'ESBL',
  'Carbapenem-resistant',
  'MRSA',
  'Fluoroquinolone-resistant',
  'Multidrug-resistant (unspecified)',
];

export default function Guidance() {
  usePageTitle('Clinical Guidance');
  const { user } = useAuth();

  const [pathogen, setPathogen] = useState('');
  const [pattern, setPattern] = useState('');
  const [county, setCounty] = useState(user?.assigned_county || '');
  const [role, setRole] = useState(user?.role || 'clinician');

  const optionsQuery = useQuery({
    queryKey: ['guidance-options'],
    queryFn: () => api.getOptions(),
    staleTime: 10 * 60 * 1000,
  });

  const mutation = useMutation({
    mutationFn: (payload) => api.getGuidanceRecommendation(payload),
  });

  const pathogens = useMemo(
    () => optionsQuery.data?.pathogens ?? [],
    [optionsQuery.data],
  );
  const counties = useMemo(
    () => optionsQuery.data?.counties ?? [],
    [optionsQuery.data],
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!pathogen.trim() || !pattern.trim()) return;
    mutation.mutate({
      pathogen_code: pathogen.trim(),
      resistance_pattern: pattern.trim(),
      user_role: role,
      county: county || undefined,
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const result = mutation.data;

  return (
    <div className="space-y-6">

      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .print-area, .print-area * { visibility: visible !important; }
          .print-area { position: absolute; left: 0; top: 0; width: 100%; padding: 0; }
          .no-print, .no-print * { display: none !important; }
          .print-hide-sidebar { display: none !important; }
          @page { margin: 15mm; }
        }
      `}</style>
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
          <BeakerIcon className="h-6 w-6 text-[var(--accent-teal)]" />
          Clinical Guidance
        </h1>
        <p className="text-sm text-[var(--text-muted)] mt-1 max-w-2xl">
          For a given pathogen and known or suspected resistance pattern,
          the model ranks potential antibiotic agents by predicted efficacy
          based on the current national dataset.
        </p>
      </div>

      <div className="bg-[var(--bg-secondary)]/80 rounded-2xl p-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Pathogen *
              </span>
              <select
                required
                value={pathogen}
                onChange={(e) => setPathogen(e.target.value)}
                className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Select pathogen…</option>
                {pathogens.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.name || p.code}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Resistance pattern *
              </span>
              <input
                required
                list="pattern-options"
                value={pattern}
                onChange={(e) => setPattern(e.target.value)}
                placeholder="e.g. ESBL, Carbapenem-resistant"
                className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg px-3 py-2 text-sm"
              />
              <datalist id="pattern-options">
                {COMMON_PATTERNS.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                County
              </span>
              <select
                value={county}
                onChange={(e) => setCounty(e.target.value)}
                className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg px-3 py-2 text-sm"
              >
                <option value="">National baseline</option>
                {counties.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Your role
              </span>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg px-3 py-2 text-sm"
              >
                <option value="clinician">Clinician</option>
                <option value="analyst">Analyst</option>
                <option value="admin">Administrator</option>
                <option value="viewer">Viewer</option>
              </select>
            </label>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={mutation.isPending || !pathogen || !pattern}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[var(--accent-teal)] text-white text-sm font-medium disabled:opacity-50"
            >
              <SparklesIcon className="h-4 w-4" />
              {mutation.isPending ? 'Consulting model…' : 'Generate recommendation'}
            </button>
          </div>
        </form>
      </div>

      {mutation.isError && (
        <EmptyState
          icon={ExclamationTriangleIcon}
          title="Could not generate recommendation"
          description={mutation.error?.message || 'The model is not available right now.'}
        />
      )}

      {mutation.isPending && (
        <div className="bg-[var(--bg-secondary)]/80 rounded-2xl p-5">
          <Skeleton className="h-40" />
        </div>
      )}

      {result && (
        <>
          {/* Primary recommendation */}
          <div className="rounded-2xl border border-[var(--accent-teal)]/30 bg-[var(--accent-teal)]/5 p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--accent-teal)]">
              Primary recommendation
            </p>
            <div className="print-area flex items-start justify-between gap-3">
              <p className="text-3xl font-bold text-[var(--text-primary)] mt-1">
                {result.primary_recommendation}
              </p>
              <button
                onClick={handlePrint}
                className="no-print inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--bg-tertiary)] text-[var(--text-primary)] hover:bg-[var(--bg-primary)] transition"
                title="Print or save as PDF"
              >
                <PrinterIcon className="w-3.5 h-3.5" />
                Print
              </button>
            </div>
            <p className="text-sm text-[var(--text-secondary)] mt-2">
              Based on pathogen{' '}
              <span className="font-mono font-medium">{result.pathogen_code}</span>{' '}
              with reported pattern{' '}
              <span className="font-medium">{result.requested_resistance_pattern}</span>,
              and{' '}
              {result.regional_demographic_context === 'National Registry baseline'
                ? 'the national baseline'
                : `county context: ${result.regional_demographic_context}`}
              .
            </p>
          </div>

          {/* Ranked alternatives */}
          <div className="bg-[var(--bg-secondary)]/80 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[var(--border-primary)]/40">
              <h2 className="text-base font-semibold text-[var(--text-primary)]">
                Ranked alternatives
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Efficacy estimates assume the current model version and
                national dataset.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[var(--bg-tertiary)]/40">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-[var(--text-muted)] w-12">#</th>
                    <th className="text-left px-4 py-3 font-medium text-[var(--text-muted)]">Agent</th>
                    <th className="text-right px-4 py-3 font-medium text-[var(--text-muted)]">Predicted resistance</th>
                    <th className="text-right px-4 py-3 font-medium text-[var(--text-muted)]">Estimated efficacy</th>
                  </tr>
                </thead>
                <tbody>
                  {result.ranked_treatment_alternatives.map((a, i) => {
                    const rate = a.resistance_rate ?? 0;
                    const susceptible = a.susceptible_rate ?? (100 - rate);
                    const band = a.confidence_band || null;
                    return (
                      <tr
                        key={a.antibiotic_agent}
                        className={`border-t border-[var(--border-primary)]/40 ${
                          i === 0 ? 'bg-[var(--accent-teal)]/5' : ''
                        }`}
                      >
                        <td className="px-4 py-3 text-[var(--text-muted)] tabular-nums">
                          {i + 1}
                        </td>
                        <td className="px-4 py-3 font-medium text-[var(--text-primary)]">
                          {a.antibiotic_agent}
                          {a.who_category && a.who_category !== 'Unclassified' && (
                            <span className="ml-2 text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                              {a.who_category}
                            </span>
                          )}
                          {i === 0 && (
                            <span className="ml-2 text-[10px] uppercase tracking-wide text-[var(--accent-teal)] font-semibold">
                              top pick
                            </span>
                          )}
                          {a.small_sample && (
                            <span className="ml-2 text-[10px] uppercase tracking-wide text-[var(--status-warning)]">
                              small sample
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-[var(--text-secondary)]">
                          {formatPercent(rate)}
                          {band && (
                            <span className="block text-[10px] text-[var(--text-muted)]">
                              {formatPercent(band.lower)}–{formatPercent(band.upper)}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-semibold">
                          <span
                            className={
                              susceptible >= 70
                                ? 'text-[var(--status-success)]'
                                : susceptible >= 50
                                ? 'text-[var(--status-warning)]'
                                : 'text-[var(--status-critical)]'
                            }
                          >
                            {formatPercent(susceptible)}
                          </span>
                          <span className="block text-[10px] text-[var(--text-muted)]">
                            {a.samples} samples
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Cross-resistance warnings */}
          {result.cross_resistance_warnings?.length > 0 && (
            <div className="rounded-2xl border border-[var(--status-warning)]/40 bg-[var(--status-warning-bg)]/20 p-5 space-y-3">
              <h2 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                <ExclamationTriangleIcon className="w-4 h-4 text-[var(--status-warning)]" />
                Cross-resistance warnings
              </h2>
              {result.cross_resistance_warnings.map((w, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider flex-shrink-0 mt-0.5 ${
                      w.severity === 'high'
                        ? 'text-[var(--status-critical)]'
                        : 'text-[var(--status-warning)]'
                    }`}
                  >
                    {w.severity}
                  </span>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    {w.message}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* AWaRe disclaimer */}
          {result.aware_disclaimer && (
            <div className="rounded-2xl border border-[var(--status-critical)]/40 bg-[var(--status-critical-bg)]/20 p-4 flex items-start gap-3">
              <ExclamationTriangleIcon className="w-5 h-5 text-[var(--status-critical)] flex-shrink-0 mt-0.5" />
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                {result.aware_disclaimer}
              </p>
            </div>
          )}

          {/* Allergies blocked */}
          {result.blocked_by_allergy?.length > 0 && (
            <div className="rounded-2xl border border-[var(--border-primary)]/40 bg-[var(--bg-secondary)]/60 p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                Excluded by patient allergy
              </h3>
              <div className="flex flex-wrap gap-2">
                {result.blocked_by_allergy.map((b) => (
                  <span
                    key={b.antibiotic_agent}
                    className="text-xs px-2 py-0.5 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-muted)] line-through"
                  >
                    {b.antibiotic_agent}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Outbreak context */}
          {result.outbreak_context && (
            <div className="rounded-2xl border border-[var(--border-primary)]/40 bg-[var(--bg-secondary)]/80 p-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                Outbreak context
              </h3>
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div>
                  <p className="text-[10px] text-[var(--text-muted)]">National</p>
                  <p className="font-semibold tabular-nums text-[var(--text-primary)]">
                    {result.outbreak_context.national_isolates}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-[var(--text-muted)]">Local</p>
                  <p className="font-semibold tabular-nums text-[var(--text-primary)]">
                    {result.outbreak_context.local_isolates}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-[var(--text-muted)]">Local share</p>
                  <p
                    className={`font-semibold tabular-nums ${
                      result.outbreak_context.elevated
                        ? 'text-[var(--status-warning)]'
                        : 'text-[var(--text-primary)]'
                    }`}
                  >
                    {result.outbreak_context.local_share_pct}%
                  </p>
                </div>
              </div>
              {result.outbreak_context.elevated && (
                <p className="text-[10px] text-[var(--status-warning)] mt-2">
                  Elevated locally — coordinate with county surveillance.
                </p>
              )}
            </div>
          )}

          {/* Cross-sector signal */}
          {result.cross_sector?.length > 0 && (
            <div className="rounded-2xl border border-[var(--border-primary)]/40 bg-[var(--bg-secondary)]/80 overflow-hidden">
              <div className="px-4 py-3 border-b border-[var(--border-primary)]/40">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Cross-sector signal
                </h3>
                <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                  Same pathogen, all sectors, last {result.data_window_days} days
                </p>
              </div>
              <ul className="divide-y divide-[var(--border-primary)]/30">
                {result.cross_sector.map((s) => (
                  <li
                    key={s.sector}
                    className="flex items-center justify-between px-4 py-2 text-xs"
                  >
                    <span className="capitalize text-[var(--text-secondary)]">
                      {s.sector}
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="text-[var(--text-muted)] tabular-nums">
                        {s.samples} samples
                      </span>
                      <span className="tabular-nums font-semibold text-[var(--text-primary)]">
                        {formatPercent(s.resistance_rate)} R
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Subgroups */}
          {result.subgroups && (
            <div className="rounded-2xl border border-[var(--border-primary)]/40 bg-[var(--bg-secondary)]/80 p-4 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Subgroup breakdown
              </h3>
              {[
                ['by_age', 'Age'],
                ['by_sex', 'Sex'],
                ['by_origin', 'Infection origin'],
                ['by_ward', 'Ward type'],
              ].map(([key, label]) => {
                const rows = result.subgroups[key] || [];
                const onlyUnknown =
                  rows.length === 1 && rows[0].bucket === 'unknown';
                return (
                  <div key={key}>
                    <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">
                      {label}
                    </p>
                    {onlyUnknown ? (
                      <p className="text-[10px] text-[var(--text-muted)] italic">
                        No subgroup data recorded — capture patient context at
                        submission to enable breakdown.
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {rows.map((r) => (
                          <span
                            key={r.bucket}
                            className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-secondary)]"
                          >
                            {r.bucket} · {r.samples} ·{' '}
                            <span className="tabular-nums font-semibold">
                              {formatPercent(r.resistance_rate)}
                            </span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Counterfactual note */}
          {result.counterfactual_note && (
            <div className="rounded-2xl border border-[var(--border-primary)]/40 bg-[var(--bg-secondary)]/60 p-4 text-xs text-[var(--text-secondary)]">
              <span className="font-semibold text-[var(--text-primary)]">
                Counterfactual.{' '}
              </span>
              {result.counterfactual_note}
            </div>
          )}

          {/* Annotation */}
          <div className="flex items-start gap-3 rounded-2xl border border-[var(--border-primary)]/40 bg-[var(--bg-secondary)]/60 p-4">
            <InformationCircleIcon className="w-5 h-5 text-[var(--text-muted)] flex-shrink-0 mt-0.5" />
            <div className="text-sm text-[var(--text-secondary)]">
              <p>{result.clinical_annotation_note}</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Role context: {result.user_role_context}. Decision support only
                — confirm with laboratory susceptibility results before changing
                treatment.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  BeakerIcon,
  SparklesIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
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

  const result = mutation.data;

  return (
    <div className="space-y-6">
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
            <p className="text-3xl font-bold text-[var(--text-primary)] mt-1">
              {result.primary_recommendation}
            </p>
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
                  {result.ranked_treatment_alternatives.map((a, i) => (
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
                        {i === 0 && (
                          <span className="ml-2 text-[10px] uppercase tracking-wide text-[var(--accent-teal)] font-semibold">
                            top pick
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-[var(--text-secondary)]">
                        {formatPercent(a.predicted_resistance_probability * 100)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold">
                        <span
                          className={
                            a.estimated_efficacy_percentage >= 70
                              ? 'text-[var(--status-success)]'
                              : a.estimated_efficacy_percentage >= 50
                              ? 'text-[var(--status-warning)]'
                              : 'text-[var(--status-critical)]'
                          }
                        >
                          {a.estimated_efficacy_percentage}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

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
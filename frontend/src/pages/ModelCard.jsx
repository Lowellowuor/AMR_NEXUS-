import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  ShieldCheck, Target, Database, Gauge, Scale, AlertTriangle,
  FileText, GitBranch, Info, ArrowLeft, Printer,
} from 'lucide-react';

import { getModelCard } from '../api/endpoints';
import { usePageTitle } from '../hooks/usePageTitle';
import EmptyState from '../components/ui/EmptyState';
import { Skeleton, SkeletonText } from '../components/ui/Skeleton';
import { formatNumber, formatPercent } from '../lib/format';

function Section({ icon: Icon, title, description, children, id }) {
  return (
    <section id={id} className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] overflow-hidden">
      <header className="flex items-start gap-3 px-5 py-4 border-b border-[var(--border-primary)]">
        <div className="w-9 h-9 rounded-lg bg-[var(--accent-teal)]/10 flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-[var(--accent-teal)]" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-[var(--text-primary)]">{title}</h2>
          {description && (
            <p className="text-xs text-[var(--text-muted)] mt-0.5">{description}</p>
          )}
        </div>
      </header>
      <div className="px-5 py-4">{children}</div>
    </section>
  );
}

function Metric({ label, value, hint, tone = 'default' }) {
  const toneClass = {
    default: 'text-[var(--text-primary)]',
    good: 'text-[var(--status-success)]',
    warn: 'text-[var(--status-warning)]',
  }[tone];
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">
        {label}
      </p>
      <p className={`text-2xl font-bold tabular-nums ${toneClass}`}>{value}</p>
      {hint && <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{hint}</p>}
    </div>
  );
}

function BulletList({ items, tone = 'default' }) {
  const marker = {
    default: 'bg-[var(--accent-teal)]',
    good: 'bg-[var(--status-success)]',
    bad: 'bg-[var(--status-critical)]',
  }[tone];
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2.5">
          <span className={`inline-block w-1.5 h-1.5 rounded-full ${marker} mt-2 flex-shrink-0`} />
          <span className="text-sm text-[var(--text-secondary)] leading-relaxed">{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default function ModelCard() {
  usePageTitle('Model Card');
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['model-card'],
    queryFn: getModelCard,
    staleTime: 10 * 60 * 1000,
  });

  const handlePrint = () => window.print();

  if (isLoading) {
    return (
      <div className="space-y-5 max-w-4xl mx-auto">
        <Skeleton className="h-10 w-64" />
        <SkeletonText lines={3} />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Could not load model card"
        description={error?.message || 'Please try again.'}
      />
    );
  }

  const { model, intended_use, performance, training_data, fairness, limitations, governance, version_history } = data;

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 no-print">
        <div className="flex items-center gap-3">
          <Link
            to="/predict"
            className="p-2 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Model Card</h1>
            <p className="text-sm text-[var(--text-muted)] mt-0.5">
              {model.name}  -  v{model.version}
            </p>
          </div>
        </div>
        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-btn)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] text-sm font-medium hover:bg-[var(--bg-tertiary)] transition"
        >
          <Printer className="w-4 h-4" />
          Print / PDF
        </button>
      </div>

      {/* Overview */}
      <Section
        icon={ShieldCheck}
        title="Overview"
        description="What this model is and who owns it"
        id="overview"
      >
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Model
            </dt>
            <dd className="text-[var(--text-primary)] mt-0.5">{model.name}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Version
            </dt>
            <dd className="text-[var(--text-primary)] mt-0.5">v{model.version}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Algorithm
            </dt>
            <dd className="text-[var(--text-primary)] mt-0.5">{model.algorithm}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Task
            </dt>
            <dd className="text-[var(--text-primary)] mt-0.5">{model.task}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Trained on
            </dt>
            <dd className="text-[var(--text-primary)] mt-0.5">{model.trained_on}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Last reviewed
            </dt>
            <dd className="text-[var(--text-primary)] mt-0.5">{model.last_reviewed}</dd>
          </div>
        </dl>
      </Section>

      {/* Intended use */}
      <Section
        icon={Target}
        title="Intended use"
        description="Where this model is appropriate and where it is not"
        id="intended-use"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--status-success)] mb-2">
              Appropriate uses
            </p>
            <BulletList items={intended_use.use} tone="good" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--status-critical)] mb-2">
              Do not use for
            </p>
            <BulletList items={intended_use.do_not_use} tone="bad" />
          </div>
        </div>
      </Section>

      {/* Performance */}
      <Section
        icon={Gauge}
        title="Performance"
        description="Validated on a held-out test set that was not used during training"
        id="performance"
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <Metric label="AUC-ROC" value={performance.auc_roc.toFixed(2)} tone="good" />
          <Metric label="Sensitivity" value={performance.sensitivity.toFixed(2)} />
          <Metric label="Specificity" value={performance.specificity.toFixed(2)} />
          <Metric label="Precision" value={performance.precision.toFixed(2)} />
          <Metric label="F1 score" value={performance.f1_score.toFixed(2)} />
          <Metric label="Calibration err" value={performance.calibration_error.toFixed(2)} tone="good" />
        </div>
        <p className="text-xs text-[var(--text-muted)] mt-4">
          Test set size: {formatNumber(performance.test_set_size)} records. Calibration error is
          the mean absolute difference between predicted probabilities and observed MDR rates.
        </p>
      </Section>

      {/* Training data */}
      <Section
        icon={Database}
        title="Training data"
        description="Sources, coverage, and feature set"
        id="training-data"
      >
        <div className="grid grid-cols-3 gap-4 mb-4">
          <Metric label="Records" value={formatNumber(training_data.records)} />
          <Metric label="Counties" value={formatNumber(training_data.counties_covered)} />
          <Metric label="Pathogens" value={formatNumber(training_data.pathogens_covered)} />
        </div>

        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mt-4 mb-2">
          Sources
        </p>
        <BulletList items={training_data.sources} />

        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mt-5 mb-2">
          Features used
        </p>
        <div className="flex flex-wrap gap-1.5">
          {training_data.features_used.map((f) => (
            <span
              key={f}
              className="inline-flex items-center text-xs font-mono px-2 py-1 rounded bg-[var(--bg-tertiary)] text-[var(--text-secondary)]"
            >
              {f}
            </span>
          ))}
        </div>

        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mt-5 mb-2">
          Explicitly excluded
        </p>
        <div className="flex flex-wrap gap-1.5">
          {training_data.features_excluded.map((f) => (
            <span
              key={f}
              className="inline-flex items-center text-xs font-mono px-2 py-1 rounded bg-[var(--status-critical-bg)] text-[var(--status-critical)] border border-[var(--status-critical-border)]"
            >
              {f}
            </span>
          ))}
        </div>
      </Section>

      {/* Fairness */}
      <Section
        icon={Scale}
        title="Fairness & coverage"
        description="How the training data is distributed across counties"
        id="fairness"
      >
        <p className="text-sm text-[var(--text-secondary)] mb-4">{fairness.note}</p>
        {fairness.by_county?.length > 0 && (
          <div className="space-y-2">
            {fairness.by_county.map((c) => (
              <div key={c.county} className="flex items-center gap-3">
                <span className="text-sm text-[var(--text-secondary)] w-32 truncate flex-shrink-0">
                  {c.county}
                </span>
                <div className="flex-1 h-2 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[var(--accent-teal)] transition-all"
                    style={{ width: `${Math.min(c.mdr_rate, 100)}%` }}
                  />
                </div>
                <span className="text-xs text-[var(--text-muted)] tabular-nums w-16 text-right flex-shrink-0">
                  {formatPercent(c.mdr_rate)}
                </span>
                <span className="text-xs text-[var(--text-muted)] tabular-nums w-12 text-right flex-shrink-0">
                  n={c.samples}
                </span>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Limitations */}
      <Section
        icon={AlertTriangle}
        title="Known limitations"
        description="Where this model may underperform or mislead"
        id="limitations"
      >
        <BulletList items={limitations} tone="bad" />
      </Section>

      {/* Governance */}
      <Section
        icon={FileText}
        title="Governance & compliance"
        description="Ownership, review cycle, and regulatory posture"
        id="governance"
      >
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Owner
            </dt>
            <dd className="text-[var(--text-primary)] mt-0.5">{governance.owner}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Review cycle
            </dt>
            <dd className="text-[var(--text-primary)] mt-0.5">{governance.review_cycle}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Approved by
            </dt>
            <dd className="text-[var(--text-primary)] mt-0.5">{governance.approved_by}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Data protection
            </dt>
            <dd className="text-[var(--text-primary)] mt-0.5">{governance.data_protection}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Audit trail
            </dt>
            <dd className="text-[var(--text-primary)] mt-0.5">{governance.audit_trail}</dd>
          </div>
        </dl>
      </Section>

      {/* Version history */}
      <Section
        icon={GitBranch}
        title="Version history"
        description="Every change to the model is documented here"
        id="version-history"
      >
        <ol className="space-y-4">
          {version_history.map((v) => (
            <li key={v.version} className="flex gap-3">
              <div className="w-2 h-2 rounded-full bg-[var(--accent-teal)] mt-1.5 flex-shrink-0" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-[var(--text-primary)]">
                    v{v.version}
                  </span>
                  <span className="text-xs text-[var(--text-muted)]">{v.date}</span>
                </div>
                <p className="text-sm text-[var(--text-secondary)] mt-0.5">{v.changes}</p>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      {/* Footer */}
      <div className="flex items-start gap-2 p-4 rounded-[var(--radius-card)] border border-[var(--status-info-border)] bg-[var(--status-info-bg)]">
        <Info className="w-4 h-4 text-[var(--status-info)] flex-shrink-0 mt-0.5" />
        <p className="text-xs text-[var(--status-info)] leading-relaxed">
          This model card follows the standard structure recommended by the WHO and the
          Partnership on AI. It is reviewed quarterly and updated with every model release.
          For clinical questions, contact the AMR Nexus surveillance team.
        </p>
      </div>
    </div>
  );
}

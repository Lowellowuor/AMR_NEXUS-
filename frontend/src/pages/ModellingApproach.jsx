import {
  BeakerIcon,
  ChartBarIcon,
  SparklesIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
  LightBulbIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import { usePageTitle } from '../hooks/usePageTitle';

function Section({ icon: Icon, title, children }) {
  return (
    <section className="bg-[var(--bg-secondary)]/80 rounded-2xl p-6 border border-[var(--border-primary)]/40">
      <h2 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2 mb-4">
        {Icon && <Icon className="w-5 h-5 text-[var(--accent-teal)]" />}
        {title}
      </h2>
      <div className="space-y-3 text-sm text-[var(--text-secondary)] leading-relaxed">
        {children}
      </div>
    </section>
  );
}

function Callout({ tone = 'info', title, children }) {
  const styles = {
    info: 'border-[var(--status-info-border)]/40 bg-[var(--status-info-bg)]/10 text-[var(--status-info)]',
    warn: 'border-[var(--status-warning-border)]/40 bg-[var(--status-warning-bg)]/10 text-[var(--status-warning)]',
    success: 'border-[var(--status-success-border)]/40 bg-[var(--status-success-bg)]/10 text-[var(--status-success)]',
  }[tone];
  const Icon = tone === 'warn' ? ExclamationTriangleIcon : InformationCircleIcon;
  return (
    <div className={`flex items-start gap-3 rounded-xl border p-4 ${styles}`}>
      <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        {title && <p className="font-semibold text-[var(--text-primary)] mb-1">{title}</p>}
        <div className="text-sm text-[var(--text-secondary)] leading-relaxed">
          {children}
        </div>
      </div>
    </div>
  );
}

export default function ModellingApproach() {
  usePageTitle('Modelling Approach');

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          Modelling Approach
        </h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          What the model predicts, why we chose this approach, and its
          documented limitations. Written for clinicians, epidemiologists, and
          Ministry reviewers who need to understand what they are being told.
        </p>
      </div>

      <Section icon={BeakerIcon} title="What the model predicts">
        <p>
          For a single isolate characterised by pathogen, specimen type,
          sector, county, antibiotic class, test method, and a small number of
          clinical or contextual features, the model produces:
        </p>
        <ul className="space-y-2 list-disc pl-5 mt-2">
          <li>
            <strong className="text-[var(--text-primary)]">MDR probability</strong> — a
            calibrated score between 0 and 1 for multidrug resistance.
          </li>
          <li>
            <strong className="text-[var(--text-primary)]">MDR classification</strong> —
            binary, at the 0.5 decision threshold (adjustable in the model card).
          </li>
          <li>
            <strong className="text-[var(--text-primary)]">SHAP attribution</strong> — the
            top contributing features and their direction (increase / decrease risk).
          </li>
          <li>
            <strong className="text-[var(--text-primary)]">Confidence tier</strong> — high,
            moderate, or borderline, derived from the calibrated distance to the
            0.5 decision boundary.
          </li>
        </ul>
        <p className="mt-3">
          Every prediction is labelled as <strong>decision support only</strong>.
          It is not a diagnosis. It is intended to guide early treatment
          decisions while laboratory culture and susceptibility results are
          pending, not to replace them.
        </p>
      </Section>

      <Section icon={ChartBarIcon} title="Why machine learning, not a compartmental model">
        <p>
          Two broad families of models appear in the AMR literature:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
          <div className="rounded-xl border border-[var(--border-primary)]/40 bg-[var(--bg-primary)]/40 p-4">
            <p className="font-semibold text-[var(--text-primary)] mb-2">
              Compartmental models
            </p>
            <p className="text-sm">
              SIR-style differential equations dividing a population into
              states (susceptible, infected, resistant). Answer questions such
              as: <em>how fast does a resistant strain spread through a
              county over time?</em> Require transmission parameters that are
              difficult to estimate for AMR.
            </p>
          </div>
          <div className="rounded-xl border border-[var(--border-primary)]/40 bg-[var(--bg-primary)]/40 p-4">
            <p className="font-semibold text-[var(--text-primary)] mb-2">
              Machine learning
            </p>
            <p className="text-sm">
              Supervised learning over individual-level features. Answers
              questions such as: <em>given this isolate and its context, how
              likely is it to be MDR?</em> Handles non-linear interactions
              between pathogen, sector, geography, and use patterns without
              needing an explicit transmission mechanism.
            </p>
          </div>
        </div>
        <Callout tone="info" title="Why we chose ML">
          The primary use case — <em>help a clinician decide on early treatment
          for a specific isolate</em> — is an individual-level prediction
          question. AMR is multi-factorial: pathogen biology, sector context,
          antimicrobial use pressure, geography, and prior exposure all
          interact in ways that are not captured by a compartmental model
          parameterised on aggregate counts.
        </Callout>
        <p>
          A compartmental model is not <em>worse</em>; it answers a different
          question. It becomes relevant when modelling the <em>population
          dynamics</em> of resistance, including behavioural spread — an
          explicit recommendation from the Makueni visit that remains on our
          roadmap as a complementary approach.
        </p>
      </Section>

      <Section icon={SparklesIcon} title="Why XGBoost, specifically">
        <p>
          XGBoost is a gradient-boosted tree ensemble. In the AMR context it
          was selected over alternative model families for four reasons
          documented in the literature and validated on our data:
        </p>
        <ul className="space-y-2 list-disc pl-5 mt-2">
          <li>
            <strong className="text-[var(--text-primary)]">Tabular, mixed-type data.</strong>{' '}
            Isolate records combine categorical (pathogen, county, sector) and
            numeric (age, month) features. Tree ensembles handle both without
            extensive feature engineering.
          </li>
          <li>
            <strong className="text-[var(--text-primary)]">Non-linear interactions.</strong>{' '}
            The effect of, say, prior antibiotic exposure differs by pathogen
            and by sector. Trees capture these interactions natively.
          </li>
          <li>
            <strong className="text-[var(--text-primary)]">Robust to missing values.</strong>{' '}
            Field data is rarely complete. XGBoost handles missing fields
            without imputation, which we verified during training.
          </li>
          <li>
            <strong className="text-[var(--text-primary)]">Explainability.</strong>{' '}
            Tree ensembles pair naturally with SHAP (Lundberg &amp; Lee, 2017),
            which produces consistent, additive, per-prediction attributions.
            A neural network with equivalent performance would not offer the
            same explainability.
          </li>
        </ul>
      </Section>

      <Section icon={SparklesIcon} title="Calibration: why the probabilities are trustworthy">
        <p>
          Raw outputs from tree ensembles are often <em>discriminative</em> but
          not <em>calibrated</em>: a model might rank MDR cases correctly while
          systematically over- or under-stating their probability. For a
          clinical decision-support tool this matters — a stated 70% chance
          should mean the event occurs about 70% of the time.
        </p>
        <p>
          We apply <strong>isotonic regression</strong> on a held-out fold
          after training. This is a monotonic, non-parametric transform that
          maps raw scores to calibrated probabilities without assuming a
          functional form. On the current model the calibrated holdout Brier
          score is <strong>0.180</strong>, improved from 0.191 pre-calibration.
        </p>
      </Section>

      <Section icon={LightBulbIcon} title="Explainability: SHAP, and what it does and doesn't say">
        <p>
          Every prediction carries a SHAP attribution. SHAP values are derived
          from cooperative game theory: they answer{' '}
          <em>how much did each feature move this prediction away from the
          average</em>, in a way that is consistent across predictions and
          sums to the model's output.
        </p>
        <Callout tone="warn" title="What SHAP is not">
          SHAP explains what the <em>model</em> relied on for a given
          prediction. It does not claim that a feature <em>caused</em> the
          resistance. Association is not causation. For population-level
          causal inference — <em>why</em> resistance is high in a particular
          county — use the{' '}
          <Link to="/root-causes" className="text-[var(--accent-teal)] underline">
            Contributing Factors
          </Link>{' '}
          view, which is explicitly framed as association, not attribution.
        </Callout>
      </Section>

      <Section icon={ExclamationTriangleIcon} title="Limitations, stated plainly">
        <p>
          A Ministry of Health deployment requires honesty about what the
          model can and cannot do. As of the current model version (v1.1.0):
        </p>
        <ul className="space-y-2 list-disc pl-5 mt-2">
          <li>
            <strong className="text-[var(--text-primary)]">Trained on synthetic data.</strong>{' '}
            The current training set is 3,000 synthetic isolates modelled on
            Kenyan epidemiology. Real-world accuracy will differ.
          </li>
          <li>
            <strong className="text-[var(--text-primary)]">No confirmed clinical outcomes yet.</strong>{' '}
            The feedback loop through which laboratory-confirmed results
            improve the model exists, but no confirmed outcomes have been
            collected to date.
          </li>
          <li>
            <strong className="text-[var(--text-primary)]">Environmental sector AUC 0.683.</strong>{' '}
            The model performs strongly for human isolates (0.770) and
            acceptably for animal (0.738), but the environment sector is
            weaker. Environmental predictions should be treated as exploratory.
          </li>
          <li>
            <strong className="text-[var(--text-primary)]">Cross-validated AUC 0.778 ± 0.013.</strong>{' '}
            Usable, but not high. For borderline predictions the confidence
            tier will say so.
          </li>
          <li>
            <strong className="text-[var(--text-primary)]">Not validated against peer-reviewed benchmarks.</strong>{' '}
            A published validation study against an independent Kenyan
            dataset is planned but not yet completed.
          </li>
        </ul>
        <p className="mt-3">
          Where the model is uncertain, the platform says so. Where data is
          missing, the platform says so. It never invents values, and it
          never presents a fallback prediction as if it were a model
          prediction.
        </p>
      </Section>

      <Section icon={DocumentTextIcon} title="Architecture decisions on record">
        <p>
          Every modelling decision in this platform is documented in an
          Architecture Decision Record (ADR) so it can be reviewed by
          Ministry technical staff and future engineers. Key records:
        </p>
        <ul className="space-y-2 list-disc pl-5 mt-2">
          <li>
            <strong>ADR-0001 — Module framework.</strong> How domains are
            organised and how the model interacts with the platform.
          </li>
          <li>
            <strong>ADR-0003 — Alembic migrations.</strong> How model versions
            and schema changes are tracked over time.
          </li>
          <li>
            <strong>ADR-0008 — Schema authority.</strong> Why the database is
            always at a known, reviewable state.
          </li>
        </ul>
        <p className="mt-3">
          A dedicated ADR on the modelling approach itself — including the
          rationale for ML over compartmental, and the plan for a
          compartmental companion model — is in preparation.
        </p>
      </Section>

      <div className="flex flex-wrap gap-2 pb-6">
        <Link
          to="/model-card"
          className="inline-flex items-center gap-1 text-sm px-4 py-2 rounded-full border border-[var(--border-primary)] hover:bg-[var(--bg-tertiary)]/60"
        >
          Open model card
        </Link>
        <Link
          to="/root-causes"
          className="inline-flex items-center gap-1 text-sm px-4 py-2 rounded-full border border-[var(--border-primary)] hover:bg-[var(--bg-tertiary)]/60"
        >
          Contributing factors
        </Link>
        <Link
          to="/guidance"
          className="inline-flex items-center gap-1 text-sm px-4 py-2 rounded-full border border-[var(--border-primary)] hover:bg-[var(--bg-tertiary)]/60"
        >
          Clinical guidance
        </Link>
      </div>
    </div>
  );
}
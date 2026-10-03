import { Link } from 'react-router-dom';
import {
  ShieldCheckIcon,
  ChartBarIcon,
  BeakerIcon,
  BellAlertIcon,
  MapPinIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';
import { usePageTitle } from '../hooks/usePageTitle';

const FEATURES = [
  {
    icon: ChartBarIcon,
    title: 'Real-time surveillance',
    body: 'Isolate-level data from human, animal, and environment sectors, aggregated across all 47 counties.',
  },
  {
    icon: BeakerIcon,
    title: 'MDR prediction with explainability',
    body: 'Machine-learning estimates for multidrug resistance, with SHAP attribution for every prediction.',
  },
  {
    icon: BellAlertIcon,
    title: 'Early-warning alerts',
    body: 'Anomaly detection and role-based alert routing to the right officer, on the right channel.',
  },
];

const PILLARS = [
  { label: 'Human', detail: 'Hospitals, clinics, laboratories' },
  { label: 'Animal', detail: 'Farms, abattoirs, veterinary services' },
  { label: 'Environment', detail: 'Soil, water, food safety' },
];

export default function Landing() {
  usePageTitle('AMR Nexus - National Antimicrobial Resistance Surveillance');

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      {/* Top nav */}
      <header className="max-w-6xl mx-auto flex items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-[var(--accent-teal)] flex items-center justify-center">
            <span className="text-white font-bold text-lg">A</span>
          </div>
          <span className="text-lg font-semibold">AMR Nexus</span>
        </div>
        <Link
          to="/login"
          className="inline-flex items-center gap-1 px-5 py-2 rounded-full bg-[var(--accent-teal)] text-white text-sm font-medium hover:opacity-90"
        >
          Sign in
          <ArrowRightIcon className="w-4 h-4" />
        </Link>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-8 pb-16">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-teal)]">
          Republic of Kenya
        </p>
        <h1 className="mt-3 text-4xl sm:text-5xl font-bold leading-tight max-w-3xl">
          National antimicrobial resistance surveillance and clinical decision support.
        </h1>
        <p className="mt-5 max-w-2xl text-base sm:text-lg text-[var(--text-secondary)]">
          AMR Nexus ingests isolate-level data from health facilities, veterinary
          sites, and environmental sampling points, and provides real-time
          surveillance, MDR prediction with explainability, and early-warning
          alerts aligned with WHO GLASS.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/login"
            className="inline-flex items-center gap-1 px-6 py-3 rounded-full bg-[var(--accent-teal)] text-white font-medium hover:opacity-90"
          >
            Sign in to the platform
            <ArrowRightIcon className="w-4 h-4" />
          </Link>
          <a
            href="#pillars"
            className="inline-flex items-center gap-1 px-6 py-3 rounded-full border border-[var(--border-primary)] text-[var(--text-secondary)] font-medium hover:bg-[var(--bg-secondary)]"
          >
            Learn more
          </a>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-secondary)]/60 p-6"
            >
              <div className="w-10 h-10 rounded-lg bg-[var(--accent-teal)]/10 flex items-center justify-center mb-4">
                <f.icon className="w-5 h-5 text-[var(--accent-teal)]" />
              </div>
              <h3 className="text-base font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-[var(--text-secondary)] leading-relaxed">
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* One Health pillars */}
      <section id="pillars" className="max-w-6xl mx-auto px-6 pb-16">
        <h2 className="text-2xl font-bold mb-2">A One Health system</h2>
        <p className="text-sm text-[var(--text-secondary)] mb-6 max-w-2xl">
          Resistance does not respect sector boundaries. AMR Nexus brings
          human, animal, and environmental data into a single analytical view.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {PILLARS.map((p) => (
            <div
              key={p.label}
              className="rounded-2xl border border-[var(--border-primary)] p-5"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--accent-teal)]">
                {p.label}
              </p>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                {p.detail}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Compliance strip */}
      <section className="max-w-6xl mx-auto px-6 pb-16">
        <div className="rounded-2xl border border-[var(--border-primary)] bg-[var(--bg-secondary)]/60 p-6 flex flex-col sm:flex-row sm:items-center gap-4">
          <ShieldCheckIcon className="w-8 h-8 text-[var(--accent-teal)] flex-shrink-0" />
          <div className="flex-1">
            <p className="font-semibold">Data Protection Act 2019 compliant</p>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Self-hosted in Kenya. No outbound transmission except to
              explicitly configured notification providers. Full audit trail
              of every privileged action.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border-primary)] mt-8">
        <div className="max-w-6xl mx-auto px-6 py-6 flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--text-muted)]">
          <span>
            <MapPinIcon className="inline w-3.5 h-3.5 mr-1 -mt-0.5" />
            Republic of Kenya · Ministry of Health
          </span>
          <div className="flex gap-4">
            <Link to="/login" className="hover:text-[var(--text-secondary)]">
              Sign in
            </Link>
            <Link to="/privacy" className="hover:text-[var(--text-secondary)]">
              Privacy notice
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { usePageTitle } from '../hooks/usePageTitle';

export default function Privacy() {
  usePageTitle('Privacy Notice');
  return (
    <div className="max-w-3xl mx-auto space-y-6 py-6">
      <div className="flex items-center gap-3">
        <Link
          to="/settings"
          className="p-2 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition"
          aria-label="Back"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Privacy Notice</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            Data Protection Act 2019 - Republic of Kenya
          </p>
        </div>
      </div>

      <div className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-6 space-y-6 text-sm leading-relaxed">
        <section>
          <h2 className="text-base font-semibold text-[var(--text-primary)] mb-2">1. Who we are</h2>
          <p className="text-[var(--text-secondary)]">
            AMR Nexus is the antimicrobial resistance surveillance platform operated under the
            authority of the Ministry of Health, Republic of Kenya. We are registered with the
            Office of the Data Protection Commissioner as a data controller.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-[var(--text-primary)] mb-2">2. What data we collect</h2>
          <p className="text-[var(--text-secondary)]">
            Isolate-level data submitted by health facilities, laboratories, and community
            surveillance sites. This includes pathogen species, specimen type, antibiotic
            susceptibility, testing method, county, and sector. We do not collect patient names,
            national ID numbers, or any direct identifiers. Records are pseudonymised at the
            point of submission.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-[var(--text-primary)] mb-2">3. Why we collect it</h2>
          <ul className="list-disc pl-5 space-y-1 text-[var(--text-secondary)]">
            <li>National and county-level antimicrobial resistance surveillance</li>
            <li>Early warning of resistance trends and anomalies</li>
            <li>Reporting to the World Health Organization (GLASS) under Kenya's obligations</li>
            <li>Antimicrobial stewardship and clinical decision support</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-[var(--text-primary)] mb-2">4. Where it is stored</h2>
          <p className="text-[var(--text-secondary)]">
            All data is stored on infrastructure located in the Republic of Kenya. Data is
            encrypted at rest and in transit. Access is role-restricted and every access event
            is logged in an immutable audit trail.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-[var(--text-primary)] mb-2">5. How long we keep it</h2>
          <p className="text-[var(--text-secondary)]">
            Isolate records: 10 years, to support longitudinal resistance surveillance. Audit
            logs: 7 years. Personal account data: for the lifetime of the account plus 90 days.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-[var(--text-primary)] mb-2">6. Your rights</h2>
          <ul className="list-disc pl-5 space-y-1 text-[var(--text-secondary)]">
            <li>Access - obtain a copy of what we hold about you (Settings - Privacy and Data)</li>
            <li>Erasure - request deletion of your personal account data</li>
            <li>Rectification - correct inaccuracies</li>
            <li>Objection - object to processing on legitimate grounds</li>
            <li>Complaint - lodge a complaint with the ODPC</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-[var(--text-primary)] mb-2">7. Contact</h2>
          <p className="text-[var(--text-secondary)]">
            Data Protection Officer, AMR Nexus
            <br />
            Email: dpo@amrnexus.org
            <br />
            ODPC: complaints@odpc.go.ke
          </p>
        </section>

        <section className="pt-4 border-t border-[var(--border-primary)]">
          <p className="text-xs text-[var(--text-muted)]">
            Last updated: {new Date().toISOString().slice(0, 10)}
          </p>
        </section>
      </div>
    </div>
  );
}

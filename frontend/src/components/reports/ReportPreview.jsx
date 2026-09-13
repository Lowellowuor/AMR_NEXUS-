import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import ReportHeader from './ReportHeader';
import ReportFooter from './ReportFooter';
import { formatNumber, formatPercent } from '../../lib/format';

const CHART = {
  grid: 'var(--border-primary)',
  tick: 'var(--text-muted)',
  tooltip: {
    backgroundColor: 'var(--bg-elevated)',
    border: '1px solid var(--border-primary)',
    borderRadius: 8,
    color: 'var(--text-primary)',
    fontSize: 12,
  },
};

function MetricCard({ label, value, hint, tone = 'default' }) {
  const toneClass = {
    default: 'text-[var(--text-primary)]',
    critical: 'text-[var(--status-critical)]',
    warning: 'text-[var(--status-warning)]',
    success: 'text-[var(--status-success)]',
  }[tone];

  return (
    <div className="border border-[var(--border-primary)] rounded-lg p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
        {label}
      </p>
      <p className={`text-2xl font-bold tabular-nums mt-1 ${toneClass}`}>{value}</p>
      {hint && <p className="text-[10px] text-[var(--text-muted)] mt-1">{hint}</p>}
    </div>
  );
}

function Section({ title, children, pageBreak = false }) {
  return (
    <section className={pageBreak ? 'print-page-break mt-8' : 'mt-6'}>
      <h2 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)] mb-3 pb-2 border-b border-[var(--border-primary)]">
        {title}
      </h2>
      {children}
    </section>
  );
}

function MetricsSection({ data }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard label="Total isolates" value={formatNumber(data.total_records)} />
      <MetricCard
        label="MDR rate"
        value={formatPercent(data.mdr_rate)}
        hint={
          data.change_mdr_rate != null
            ? `${data.change_mdr_rate >= 0 ? '+' : ''}${data.change_mdr_rate} pts vs previous period`
            : null
        }
        tone={
          data.mdr_rate >= 60 ? 'critical' : data.mdr_rate >= 30 ? 'warning' : 'success'
        }
      />
      <MetricCard label="Active anomalies" value={formatNumber(data.anomaly_count)} tone="warning" />
      <MetricCard label="Pathogens observed" value={formatNumber(data.pathogen_count)} />
    </div>
  );
}

function TrendSection({ data }) {
  if (!data?.length) return <p className="text-sm text-[var(--text-muted)]">No trend data</p>;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: CHART.tick }} />
        <YAxis unit="%" domain={[0, 100]} tick={{ fontSize: 11, fill: CHART.tick }} />
        <Tooltip formatter={(v) => `${v}%`} contentStyle={CHART.tooltip} />
        <Line type="monotone" dataKey="mdr_rate" stroke="var(--accent-blue)" strokeWidth={2} dot={{ r: 3 }} name="MDR rate" />
      </LineChart>
    </ResponsiveContainer>
  );
}

function PathogenTable({ data }) {
  if (!data?.length) return <p className="text-sm text-[var(--text-muted)]">No pathogen data</p>;
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-[var(--border-primary)]">
          <th className="text-left py-2 font-semibold text-[var(--text-secondary)]">Pathogen</th>
          <th className="text-right py-2 font-semibold text-[var(--text-secondary)]">Samples</th>
          <th className="text-right py-2 font-semibold text-[var(--text-secondary)]">MDR</th>
          <th className="text-right py-2 font-semibold text-[var(--text-secondary)]">MDR rate</th>
        </tr>
      </thead>
      <tbody>
        {data.map((p) => (
          <tr key={p.pathogen} className="border-b border-[var(--border-primary)] last:border-0">
            <td className="py-2 text-[var(--text-primary)]">{p.pathogen}</td>
            <td className="py-2 text-right tabular-nums text-[var(--text-secondary)]">{formatNumber(p.samples)}</td>
            <td className="py-2 text-right tabular-nums text-[var(--text-secondary)]">{formatNumber(p.mdr_count)}</td>
            <td className="py-2 text-right tabular-nums font-medium text-[var(--text-primary)]">
              {formatPercent(p.mdr_rate)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SectorTable({ data }) {
  if (!data?.length) return <p className="text-sm text-[var(--text-muted)]">No sector data</p>;
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-[var(--border-primary)]">
          <th className="text-left py-2 font-semibold text-[var(--text-secondary)]">Sector</th>
          <th className="text-right py-2 font-semibold text-[var(--text-secondary)]">Samples</th>
          <th className="text-right py-2 font-semibold text-[var(--text-secondary)]">MDR rate</th>
        </tr>
      </thead>
      <tbody>
        {data.map((s) => (
          <tr key={s.sector} className="border-b border-[var(--border-primary)] last:border-0">
            <td className="py-2 text-[var(--text-primary)] capitalize">{s.sector}</td>
            <td className="py-2 text-right tabular-nums text-[var(--text-secondary)]">{formatNumber(s.samples)}</td>
            <td className="py-2 text-right tabular-nums font-medium text-[var(--text-primary)]">
              {formatPercent(s.mdr_rate)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function CountyTable({ data }) {
  if (!data?.length) return <p className="text-sm text-[var(--text-muted)]">No county data</p>;
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-[var(--border-primary)]">
          <th className="text-left py-2 font-semibold text-[var(--text-secondary)]">County</th>
          <th className="text-right py-2 font-semibold text-[var(--text-secondary)]">Samples</th>
          <th className="text-right py-2 font-semibold text-[var(--text-secondary)]">MDR rate</th>
        </tr>
      </thead>
      <tbody>
        {data.map((c) => (
          <tr key={c.county} className="border-b border-[var(--border-primary)] last:border-0">
            <td className="py-2 text-[var(--text-primary)]">{c.county}</td>
            <td className="py-2 text-right tabular-nums text-[var(--text-secondary)]">{formatNumber(c.samples)}</td>
            <td className="py-2 text-right tabular-nums font-medium text-[var(--text-primary)]">
              {formatPercent(c.mdr_rate)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function AnomalyList({ data }) {
  if (!data?.length) return null;
  return (
    <ul className="space-y-2">
      {data.map((a) => (
        <li
          key={a.record_id}
          className="flex items-start gap-3 py-2 border-b border-[var(--border-primary)] last:border-0"
        >
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--status-warning)] mt-2 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-[var(--text-primary)]">
              {a.pathogen} · {a.county}
            </p>
            <p className="text-[10px] text-[var(--text-muted)]">
              Score {a.anomaly_score.toFixed(3)} · {a.date ? new Date(a.date).toLocaleDateString('en-KE') : '—'}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

function renderSection(section) {
  switch (section.type) {
    case 'metrics':
      return <MetricsSection data={section.data} />;
    case 'trend':
      return <TrendSection data={section.data} />;
    case 'pathogen_table':
      return <PathogenTable data={section.data} />;
    case 'sector_table':
      return <SectorTable data={section.data} />;
    case 'county_table':
      return <CountyTable data={section.data} />;
    case 'anomaly_list':
      return <AnomalyList data={section.data} />;
    default:
      return null;
  }
}

export default function ReportPreview({ report, loading, error }) {
  if (loading) {
    return (
      <div className="bg-white rounded-[var(--radius-card)] border border-[var(--border-primary)] p-6 space-y-4">
        <div className="h-16 rounded-lg bg-[var(--bg-tertiary)] animate-pulse" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-lg bg-[var(--bg-tertiary)] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[var(--bg-secondary)] rounded-[var(--radius-card)] border border-[var(--status-critical-border)] p-6">
        <p className="text-[var(--status-critical)] text-sm">{error}</p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="bg-[var(--bg-secondary)] rounded-[var(--radius-card)] border border-[var(--border-primary)] p-10 text-center">
        <p className="text-sm text-[var(--text-muted)]">
          Select a report type and date range, then click Generate.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[var(--bg-secondary)] rounded-[var(--radius-card)] border border-[var(--border-primary)] p-6 sm:p-8">
      <ReportHeader meta={report.meta} />

      {report.sections.map((section) => (
        <Section key={section.id} title={section.title}>
          {renderSection(section)}
        </Section>
      ))}

      <ReportFooter meta={report.meta} />
    </div>
  );
}

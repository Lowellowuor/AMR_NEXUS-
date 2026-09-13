import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import {
  Activity, Gauge, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Microscope,
  Cpu, Zap, Clock, ShieldCheck, Sparkles, GitBranch, FileText,
} from 'lucide-react';

import {
  getActiveModel, getModelPerformance, getModelCalibration, getModelDrift,
  getModelRegistry, getRecentPredictions, getConfirmedStats, getRecentConfirmations,
} from '../api/endpoints';
import { usePageTitle } from '../hooks/usePageTitle';
import { formatNumber, formatPercent, timeAgo, formatDateTime } from '../lib/format';
import { Link } from 'react-router-dom';
import { chartColors, tooltipStyle, axisTick } from '../lib/chartTheme';
import EmptyState from '../components/ui/EmptyState';
import { Skeleton } from '../components/ui/Skeleton';

const WINDOWS = [
  { id: 7, label: '7 days' },
  { id: 30, label: '30 days' },
  { id: 90, label: '90 days' },
  { id: 180, label: '180 days' },
];

function StatusPill({ status }) {
  const map = {
    stable: { bg: 'bg-[var(--status-success-bg)]', text: 'text-[var(--status-success)]', border: 'border-[var(--status-success-border)]', label: 'Stable' },
    warning: { bg: 'bg-[var(--status-warning-bg)]', text: 'text-[var(--status-warning)]', border: 'border-[var(--status-warning-border)]', label: 'Warning' },
    critical: { bg: 'bg-[var(--status-critical-bg)]', text: 'text-[var(--status-critical)]', border: 'border-[var(--status-critical-border)]', label: 'Critical' },
    insufficient_data: { bg: 'bg-[var(--bg-tertiary)]', text: 'text-[var(--text-muted)]', border: 'border-[var(--border-primary)]', label: 'No data' },
  };
  const cfg = map[status] || map.stable;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      {cfg.label}
    </span>
  );
}

function Metric({ label, value, hint, tone = 'default', icon: Icon }) {
  const toneClass = {
    default: 'text-[var(--text-primary)]',
    critical: 'text-[var(--status-critical)]',
    warning: 'text-[var(--status-warning)]',
    success: 'text-[var(--status-success)]',
  }[tone];
  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-4">
      <div className="flex items-start justify-between mb-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">{label}</p>
        {Icon && <Icon className="w-3.5 h-3.5 text-[var(--text-muted)]" />}
      </div>
      <p className={`text-2xl font-bold tabular-nums ${toneClass}`}>{value}</p>
      {hint && <p className="text-[10px] text-[var(--text-muted)] mt-1">{hint}</p>}
    </div>
  );
}

export default function ModelHealth() {
  usePageTitle('Model Health');
  const [windowDays, setWindowDays] = useState(90);

  const { data: active } = useQuery({ queryKey: ['ml-active'], queryFn: getActiveModel, staleTime: 60_000 });
  const { data: perf, isLoading: perfLoading } = useQuery({
    queryKey: ['ml-perf', windowDays],
    queryFn: () => getModelPerformance(windowDays),
    staleTime: 60_000,
  });
  const { data: calib } = useQuery({
    queryKey: ['ml-calib', windowDays],
    queryFn: () => getModelCalibration(windowDays),
    staleTime: 60_000,
  });
  const { data: drift } = useQuery({
    queryKey: ['ml-drift', 30],
    queryFn: () => getModelDrift(30),
    staleTime: 60_000,
  });
  const { data: registry } = useQuery({ queryKey: ['ml-registry'], queryFn: getModelRegistry, staleTime: 5 * 60 * 1000 });
  const { data: confirmed } = useQuery({
    queryKey: ['ml-confirmed', windowDays],
    queryFn: () => getConfirmedStats(windowDays),
    staleTime: 60_000,
  });
  const { data: recentConfirmations } = useQuery({
    queryKey: ['ml-recent-confirmations'],
    queryFn: () => getRecentConfirmations(10),
    staleTime: 30_000,
  });
  const { data: recent } = useQuery({
    queryKey: ['ml-recent'],
    queryFn: () => getRecentPredictions(30),
    staleTime: 30_000,
  });

  const metrics = active?.metrics || {};
  const calibData = (calib?.buckets || []).map((b) => ({
    ...b,
    ideal: b.predicted,
  }));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Cpu className="w-5 h-5 text-[var(--accent-teal)]" />
            Model Health
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            Live performance, calibration, drift, and version history
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {WINDOWS.map((w) => (
            <button
              key={w.id}
              onClick={() => setWindowDays(w.id)}
              className={`text-xs px-3 py-1.5 rounded-full border transition ${
                windowDays === w.id
                  ? 'border-[var(--accent-teal)] bg-[var(--accent-teal)]/10 text-[var(--accent-teal)] font-semibold'
                  : 'border-[var(--border-primary)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
              }`}
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>

      {/* Active model */}
      <div className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[var(--accent-teal)]/10 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-[var(--accent-teal)]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">{active?.algorithm || 'XGBoost'} v{active?.version || '1.0.0'}</h2>
              <p className="text-xs text-[var(--text-muted)]">
                {active?.trained_at ? `Trained ${formatDateTime(active.trained_at)}` : 'Active model'}
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full bg-[var(--status-success-bg)] text-[var(--status-success)] border border-[var(--status-success-border)]">
            <CheckCircle2 className="w-3 h-3" />
            Active
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          <Metric label="AUC-ROC" value={metrics.auc_roc?.toFixed(2) || '—'} tone="success" />
          <Metric label="Sensitivity" value={metrics.sensitivity?.toFixed(2) || '—'} />
          <Metric label="Specificity" value={metrics.specificity?.toFixed(2) || '—'} />
          <Metric label="Precision" value={metrics.precision?.toFixed(2) || '—'} />
          <Metric label="F1 score" value={metrics.f1_score?.toFixed(2) || '—'} />
          <Metric label="Calibration err" value={metrics.calibration_error?.toFixed(3) || '—'} tone="success" />
        </div>
      </div>

      {/* Live performance */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3 flex items-center gap-2">
          <Activity className="w-4 h-4" />
          Live performance (last {windowDays} days)
        </h2>
        {perfLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-[var(--radius-card)]" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Metric label="Predictions" value={formatNumber(perf?.total_predictions)} hint={`last ${windowDays} days`} icon={Sparkles} />
            <Metric label="Average latency" value={perf?.avg_latency_ms != null ? `${perf.avg_latency_ms} ms` : '—'} icon={Zap} />
            <Metric
              label="Fallback rate"
              value={perf?.fallback_rate != null ? `${perf.fallback_rate}%` : '—'}
              tone={perf?.fallback_rate >= 10 ? 'warning' : 'success'}
              hint="Rule-based fallback usage"
              icon={AlertTriangle}
            />
            <Metric
              label="P95 latency"
              value={perf?.p95_latency_ms != null ? `${perf.p95_latency_ms} ms` : '—'}
              hint="95th percentile"
              icon={Clock}
            />
          </div>
        )}
      </div>

      {/* Confirmed outcomes — the feedback loop */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3 flex items-center gap-2">
          <Microscope className="w-4 h-4" />
          Laboratory-confirmed outcomes
        </h2>
        {confirmed?.confirmed === 0 ? (
          <div className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-5 flex flex-col items-start gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[var(--status-warning-bg)] flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-[var(--status-warning)]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  No outcomes confirmed yet
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5 max-w-lg">
                  The model cannot be calibrated without laboratory confirmation.
                  Open any prediction in History and confirm the actual MDR result.
                  Every confirmed outcome improves future predictions.
                </p>
              </div>
            </div>
            <Link
              to="/history"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-btn)] bg-[var(--accent-teal)] text-white text-sm font-medium hover:bg-[var(--accent-teal-hover)] transition"
            >
              Open History
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Metric
                label="Confirmed"
                value={`${formatNumber(confirmed.confirmed)} / ${formatNumber(confirmed.total_predictions)}`}
                hint={`${confirmed.confirmation_rate}% confirmation rate`}
                icon={Microscope}
              />
              <Metric
                label="Accuracy"
                value={confirmed.accuracy != null ? `${confirmed.accuracy}%` : '—'}
                tone={confirmed.accuracy >= 80 ? 'success' : confirmed.accuracy >= 65 ? 'warning' : 'critical'}
                hint="Predicted vs lab-confirmed"
                icon={CheckCircle2}
              />
              <Metric
                label="Sensitivity"
                value={confirmed.sensitivity != null ? `${confirmed.sensitivity}%` : '—'}
                hint="True positive rate"
              />
              <Metric
                label="Specificity"
                value={confirmed.specificity != null ? `${confirmed.specificity}%` : '—'}
                hint="True negative rate"
              />
            </div>

            <div className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-5">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Confusion matrix</h3>
              <div className="grid grid-cols-2 gap-3 max-w-md">
                <div className="rounded-lg border border-[var(--status-success-border)] bg-[var(--status-success-bg)] p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--status-success)]">True positives</p>
                  <p className="text-xl font-bold tabular-nums text-[var(--status-success)] mt-1">{confirmed.confusion.tp}</p>
                </div>
                <div className="rounded-lg border border-[var(--status-critical-border)] bg-[var(--status-critical-bg)] p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--status-critical)]">False positives</p>
                  <p className="text-xl font-bold tabular-nums text-[var(--status-critical)] mt-1">{confirmed.confusion.fp}</p>
                </div>
                <div className="rounded-lg border border-[var(--status-critical-border)] bg-[var(--status-critical-bg)] p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--status-critical)]">False negatives</p>
                  <p className="text-xl font-bold tabular-nums text-[var(--status-critical)] mt-1">{confirmed.confusion.fn}</p>
                </div>
                <div className="rounded-lg border border-[var(--status-success-border)] bg-[var(--status-success-bg)] p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--status-success)]">True negatives</p>
                  <p className="text-xl font-bold tabular-nums text-[var(--status-success)] mt-1">{confirmed.confusion.tn}</p>
                </div>
              </div>
            </div>

            {recentConfirmations?.length > 0 && (
              <div className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] overflow-hidden">
                <div className="px-5 py-3 border-b border-[var(--border-primary)]">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">Recent confirmations</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-[var(--bg-tertiary)] border-b border-[var(--border-primary)]">
                      <tr>
                        <th className="text-left px-5 py-2 font-semibold text-[var(--text-secondary)]">When</th>
                        <th className="text-left px-5 py-2 font-semibold text-[var(--text-secondary)]">Pathogen</th>
                        <th className="text-left px-5 py-2 font-semibold text-[var(--text-secondary)]">County</th>
                        <th className="text-right px-5 py-2 font-semibold text-[var(--text-secondary)]">Predicted</th>
                        <th className="text-right px-5 py-2 font-semibold text-[var(--text-secondary)]">Actual</th>
                        <th className="text-left px-5 py-2 font-semibold text-[var(--text-secondary)]">Match</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-primary)]">
                      {recentConfirmations.map((r) => (
                        <tr key={r.record_id} className="hover:bg-[var(--bg-tertiary)]/40">
                          <td className="px-5 py-2 text-xs text-[var(--text-muted)]">{timeAgo(r.confirmed_at)}</td>
                          <td className="px-5 py-2 text-[var(--text-primary)] font-medium">{r.pathogen_code || '—'}</td>
                          <td className="px-5 py-2 text-[var(--text-secondary)]">{r.county || '—'}</td>
                          <td className="px-5 py-2 text-right tabular-nums text-[var(--text-secondary)]">
                            {r.predicted_probability != null ? formatPercent(r.predicted_probability * 100) : '—'}
                          </td>
                          <td className="px-5 py-2 text-right">
                            {r.actual_mdr
                              ? <span className="text-[10px] font-bold uppercase text-[var(--status-critical)]">MDR</span>
                              : <span className="text-[10px] font-bold uppercase text-[var(--status-success)]">S</span>}
                          </td>
                          <td className="px-5 py-2">
                            {r.matched
                              ? <span className="text-[10px] font-bold uppercase text-[var(--status-success)]">Match</span>
                              : <span className="text-[10px] font-bold uppercase text-[var(--status-warning)]">Miss</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Confidence distribution */}
      {perf?.confidence_distribution && Object.keys(perf.confidence_distribution).length > 0 && (
        <div className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-5">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Confidence distribution</h3>
          <div className="space-y-3">
            {['high', 'moderate', 'borderline', 'unknown'].map((tier) => {
              const count = perf.confidence_distribution[tier] || 0;
              const total = Object.values(perf.confidence_distribution).reduce((a, b) => a + b, 0) || 1;
              const pct = (count / total) * 100;
              const tone = {
                high: 'bg-[var(--status-success)]',
                moderate: 'bg-[var(--status-warning)]',
                borderline: 'bg-[var(--status-critical)]',
                unknown: 'bg-[var(--text-muted)]',
              }[tier];
              return (
                <div key={tier}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs capitalize text-[var(--text-secondary)]">{tier}</span>
                    <span className="text-xs tabular-nums text-[var(--text-primary)] font-medium">
                      {formatNumber(count)} ({pct.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                    <div className={`h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Calibration */}
      <div className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Calibration</h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              When the model says 70%, does it happen 70% of the time?
            </p>
          </div>
          {calib?.calibration_error != null && (
            <div className="text-right">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Calibration error</p>
              <p className={`text-lg font-bold tabular-nums ${calib.calibration_error < 0.05 ? 'text-[var(--status-success)]' : 'text-[var(--status-warning)]'}`}>
                {calib.calibration_error.toFixed(3)}
              </p>
            </div>
          )}
        </div>

        {!calib || calib.buckets.length === 0 ? (
          <EmptyState icon={Gauge} title="Not enough data" description="Calibration will appear once predictions have been logged." />
        ) : (
          <>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={calibData}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
                <XAxis dataKey="predicted" unit="%" tick={axisTick} />
                <YAxis unit="%" domain={[0, 100]} tick={axisTick} />
                <Tooltip formatter={(v) => `${v}%`} contentStyle={tooltipStyle} />
                <ReferenceLine
                  segment={[{ x: 0, y: 0 }, { x: 100, y: 100 }]}
                  stroke="var(--text-muted)"
                  strokeDasharray="5 5"
                  label={{ value: 'Perfect', position: 'insideTopLeft', fill: 'var(--text-muted)', fontSize: 10 }}
                />
                <Line type="monotone" dataKey="observed" stroke={chartColors.blue} strokeWidth={2} name="Observed" />
              </LineChart>
            </ResponsiveContainer>
            <p className="text-xs text-[var(--text-muted)] mt-2">
              Sample size: {formatNumber(calib.sample_size)} predictions.
              {calib.calibration_error != null && calib.calibration_error < 0.05 && ' The model is well calibrated.'}
              {calib.calibration_error != null && calib.calibration_error >= 0.05 && calib.calibration_error < 0.1 && ' Minor miscalibration — acceptable.'}
              {calib.calibration_error != null && calib.calibration_error >= 0.1 && ' Significant miscalibration — retraining recommended.'}
            </p>
          </>
        )}
      </div>

      {/* Drift */}
      <div className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[var(--accent-teal)]" />
              Feature drift (30 days vs baseline)
            </h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Has the incoming data shifted away from what the model was trained on?
            </p>
          </div>
          {drift && <StatusPill status={drift.status} />}
        </div>

        {!drift ? (
          <Skeleton className="h-40" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-[var(--border-primary)]">
                <tr>
                  <th className="text-left py-2 font-semibold text-[var(--text-secondary)]">Feature</th>
                  <th className="text-right py-2 font-semibold text-[var(--text-secondary)]">Drift score</th>
                  <th className="text-right py-2 font-semibold text-[var(--text-secondary)]">Status</th>
                  <th className="text-left py-2 pl-6 font-semibold text-[var(--text-secondary)]">Top changes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-primary)]">
                {(drift.features || []).map((f) => (
                  <tr key={f.feature}>
                    <td className="py-2 text-[var(--text-primary)] font-mono text-xs">{f.feature}</td>
                    <td className="py-2 text-right tabular-nums text-[var(--text-secondary)]">{f.drift.toFixed(3)}</td>
                    <td className="py-2 text-right"><StatusPill status={f.status} /></td>
                    <td className="py-2 pl-6">
                      <div className="space-y-0.5">
                        {(f.top_changes || []).slice(0, 2).map((c, i) => (
                          <div key={i} className="text-xs text-[var(--text-muted)] flex gap-3">
                            <span className="font-mono text-[var(--text-secondary)] truncate max-w-[140px]">
                              {c.value || '(empty)'}
                            </span>
                            <span className="tabular-nums">
                              {c.historical_pct}% → {c.current_pct}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Registry */}
      <div className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] overflow-hidden">
        <div className="px-5 py-3 border-b border-[var(--border-primary)] flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-[var(--text-muted)]" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Version history</h3>
        </div>
        {!registry || registry.length === 0 ? (
          <EmptyState icon={FileText} title="No versions registered" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--bg-tertiary)] border-b border-[var(--border-primary)]">
                <tr>
                  <th className="text-left px-5 py-2 font-semibold text-[var(--text-secondary)]">Version</th>
                  <th className="text-left px-5 py-2 font-semibold text-[var(--text-secondary)]">Algorithm</th>
                  <th className="text-left px-5 py-2 font-semibold text-[var(--text-secondary)]">Trained</th>
                  <th className="text-right px-5 py-2 font-semibold text-[var(--text-secondary)]">AUC</th>
                  <th className="text-right px-5 py-2 font-semibold text-[var(--text-secondary)]">Sens</th>
                  <th className="text-right px-5 py-2 font-semibold text-[var(--text-secondary)]">Spec</th>
                  <th className="text-right px-5 py-2 font-semibold text-[var(--text-secondary)]">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-primary)]">
                {registry.map((m) => (
                  <tr key={m.id} className="hover:bg-[var(--bg-tertiary)]/40">
                    <td className="px-5 py-2 text-[var(--text-primary)] font-medium">v{m.version}</td>
                    <td className="px-5 py-2 text-[var(--text-secondary)]">{m.algorithm || '—'}</td>
                    <td className="px-5 py-2 text-xs text-[var(--text-muted)]">{m.trained_at ? formatDateTime(m.trained_at) : '—'}</td>
                    <td className="px-5 py-2 text-right tabular-nums text-[var(--text-secondary)]">{m.metrics?.auc_roc?.toFixed(2) || '—'}</td>
                    <td className="px-5 py-2 text-right tabular-nums text-[var(--text-secondary)]">{m.metrics?.sensitivity?.toFixed(2) || '—'}</td>
                    <td className="px-5 py-2 text-right tabular-nums text-[var(--text-secondary)]">{m.metrics?.specificity?.toFixed(2) || '—'}</td>
                    <td className="px-5 py-2 text-right">
                      {m.is_active ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--status-success-bg)] text-[var(--status-success)] border border-[var(--status-success-border)]">
                          Active
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Archived</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent predictions */}
      <div className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] overflow-hidden">
        <div className="px-5 py-3 border-b border-[var(--border-primary)] flex items-center gap-2">
          <Activity className="w-4 h-4 text-[var(--text-muted)]" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Recent predictions</h3>
        </div>
        {!recent || recent.length === 0 ? (
          <EmptyState icon={Activity} title="No predictions logged" />
        ) : (
          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-sm">
              <thead className="bg-[var(--bg-tertiary)] border-b border-[var(--border-primary)] sticky top-0">
                <tr>
                  <th className="text-left px-5 py-2 font-semibold text-[var(--text-secondary)]">When</th>
                  <th className="text-right px-5 py-2 font-semibold text-[var(--text-secondary)]">MDR prob</th>
                  <th className="text-left px-5 py-2 font-semibold text-[var(--text-secondary)]">MDR</th>
                  <th className="text-left px-5 py-2 font-semibold text-[var(--text-secondary)]">Anomaly</th>
                  <th className="text-left px-5 py-2 font-semibold text-[var(--text-secondary)]">Confidence</th>
                  <th className="text-right px-5 py-2 font-semibold text-[var(--text-secondary)]">Latency</th>
                  <th className="text-left px-5 py-2 font-semibold text-[var(--text-secondary)]">Version</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-primary)]">
                {recent.map((r) => (
                  <tr key={r.id} className="hover:bg-[var(--bg-tertiary)]/40">
                    <td className="px-5 py-2 text-xs text-[var(--text-muted)]">{timeAgo(r.created_at)}</td>
                    <td className="px-5 py-2 text-right tabular-nums text-[var(--text-primary)]">
                      {r.mdr_probability != null ? formatPercent(r.mdr_probability * 100) : '—'}
                    </td>
                    <td className="px-5 py-2">
                      {r.mdr_flag
                        ? <span className="text-[10px] font-bold uppercase text-[var(--status-critical)]">MDR</span>
                        : <span className="text-[10px] font-bold uppercase text-[var(--status-success)]">S</span>}
                    </td>
                    <td className="px-5 py-2">
                      {r.anomaly_flag
                        ? <span className="text-[10px] font-bold uppercase text-[var(--status-warning)]">Flagged</span>
                        : <span className="text-[10px] text-[var(--text-muted)]">—</span>}
                    </td>
                    <td className="px-5 py-2">
                      <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                        r.confidence_tier === 'high' ? 'bg-[var(--status-success-bg)] text-[var(--status-success)] border-[var(--status-success-border)]'
                          : r.confidence_tier === 'moderate' ? 'bg-[var(--status-warning-bg)] text-[var(--status-warning)] border-[var(--status-warning-border)]'
                          : r.confidence_tier === 'borderline' ? 'bg-[var(--status-critical-bg)] text-[var(--status-critical)] border-[var(--status-critical-border)]'
                          : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] border-[var(--border-primary)]'
                      }`}>
                        {r.confidence_tier || 'unknown'}
                      </span>
                    </td>
                    <td className="px-5 py-2 text-right tabular-nums text-xs text-[var(--text-muted)]">
                      {r.latency_ms != null ? `${r.latency_ms.toFixed(0)} ms` : '—'}
                    </td>
                    <td className="px-5 py-2 text-xs font-mono text-[var(--text-muted)]">{r.model_version || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

import { useState } from 'react';
import {
  Printer, Copy, Check, TrendingUp, TrendingDown, AlertTriangle, Info,
} from 'lucide-react';
import { formatPercent, formatDateTime } from '../../lib/format';

function ConfidenceBadge({ probability }) {
  const p = probability ?? 0;
  const dist = Math.abs(p - 0.5);

  let tier, tone, text;
  if (dist >= 0.35) {
    tier = 'high';
    tone = p >= 0.5 ? 'critical' : 'success';
    text = 'High confidence';
  } else if (dist >= 0.15) {
    tier = 'moderate';
    tone = p >= 0.5 ? 'warning' : 'success';
    text = 'Moderate confidence';
  } else {
    tier = 'borderline';
    tone = 'warning';
    text = 'Borderline — interpret with caution';
  }

  const toneClass = {
    critical: 'bg-[var(--status-critical-bg)] text-[var(--status-critical)] border-[var(--status-critical-border)]',
    warning: 'bg-[var(--status-warning-bg)] text-[var(--status-warning)] border-[var(--status-warning-border)]',
    success: 'bg-[var(--status-success-bg)] text-[var(--status-success)] border-[var(--status-success-border)]',
  }[tone];

  return (
    <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full border ${toneClass}`}>
      {text}
    </span>
  );
}

function buildSummaryText(result) {
  const p = (result.mdr_probability ?? 0) * 100;
  const lines = [
    'AMR Nexus — Prediction Summary',
    '─'.repeat(40),
    `Record ID:       ${result.record_id || '—'}`,
    `MDR probability: ${p.toFixed(1)}%`,
    `MDR status:      ${result.mdr_flag ? 'Likely MDR' : 'Likely susceptible'}`,
    `Anomaly:         ${result.anomaly_detected ? `Flagged (score ${(result.anomaly_score ?? 0).toFixed(3)})` : 'Normal'}`,
    `Top feature:     ${result.shap_top_feature || '—'}`,
    `SHAP value:      ${(result.shap_value ?? 0).toFixed(3)}`,
    '',
    'Interpretation:',
    result.shap_summary || '—',
    '',
    '⚠ Decision support only. Not a diagnosis.',
    'Confirm with laboratory culture and susceptibility results.',
    '',
    `Generated: ${formatDateTime(new Date().toISOString())} (EAT)`,
  ];
  return lines.join('\n');
}

export default function ResultCard({ result }) {
  const [copied, setCopied] = useState(false);

  if (!result) return null;

  const prob = (result.mdr_probability ?? 0) * 100;
  const isMdr = result.mdr_flag;
  const isAnomaly = result.anomaly_detected;
  const shapPositive = (result.shap_value ?? 0) >= 0;
  const shapAbs = Math.abs(result.shap_value ?? 0);
  const shapWidth = Math.min(shapAbs * 100, 100);

  const handlePrint = () => {
    document.body.classList.add('printing-result');
    setTimeout(() => {
      window.print();
      setTimeout(() => document.body.classList.remove('printing-result'), 300);
    }, 50);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(buildSummaryText(result));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // silent
    }
  };

  const tone = isMdr ? 'critical' : 'success';
  const toneColor = isMdr ? 'text-[var(--status-critical)]' : 'text-[var(--status-success)]';
  const toneBg = isMdr ? 'bg-[var(--status-critical-bg)]' : 'bg-[var(--status-success-bg)]';

  return (
    <div
      data-print-region="result"
      className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] overflow-hidden"
    >
      {/* Header */}
      <div className={`flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-[var(--border-primary)] ${toneBg}`}>
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isMdr ? 'bg-[var(--status-critical)]' : 'bg-[var(--status-success)]'} text-white flex-shrink-0`}>
            {isMdr ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Prediction result
            </p>
            <p className={`text-lg font-bold ${toneColor} truncate`}>
              {isMdr ? 'Likely MDR' : 'Likely susceptible'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 no-print">
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-btn)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] text-xs font-medium hover:bg-[var(--bg-tertiary)] transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[var(--status-success)]" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-btn)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] text-xs font-medium hover:bg-[var(--bg-tertiary)] transition"
          >
            <Printer className="w-3.5 h-3.5" />
            Print
          </button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 px-5 py-5 border-b border-[var(--border-primary)]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">
            MDR probability
          </p>
          <p className={`text-3xl font-bold tabular-nums ${toneColor}`}>
            {formatPercent(prob)}
          </p>
          <div className="mt-2">
            <ConfidenceBadge probability={result.mdr_probability} />
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">
            Anomaly
          </p>
          {isAnomaly ? (
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-[var(--status-warning)]" />
              <span className="text-base font-semibold text-[var(--status-warning)]">
                Flagged
              </span>
            </div>
          ) : (
            <p className="text-base font-semibold text-[var(--text-secondary)]">Normal</p>
          )}
          <p className="text-xs text-[var(--text-muted)] mt-1 tabular-nums">
            Score {(result.anomaly_score ?? 0).toFixed(3)}
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">
            Record ID
          </p>
          <p className="text-xs font-mono text-[var(--text-primary)] break-all">
            {result.record_id || '—'}
          </p>
        </div>
      </div>

      {/* Explainability */}
      <div className="px-5 py-4 border-b border-[var(--border-primary)]">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2">
          Model explanation
        </p>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-3">
          {result.shap_summary || 'No explanation available.'}
        </p>
        {result.shap_top_feature && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-[var(--text-primary)] font-mono truncate pr-2">
                {result.shap_top_feature}
              </span>
              <span
                className={`text-xs font-semibold tabular-nums flex-shrink-0 ${
                  shapPositive
                    ? 'text-[var(--status-critical)]'
                    : 'text-[var(--status-success)]'
                }`}
              >
                {shapPositive ? '+' : ''}
                {(result.shap_value ?? 0).toFixed(3)}
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  shapPositive ? 'bg-[var(--status-critical)]' : 'bg-[var(--status-success)]'
                }`}
                style={{ width: `${shapWidth}%` }}
              />
            </div>
            <p className="text-[10px] text-[var(--text-muted)] mt-1">
              {shapPositive ? 'Increases' : 'Decreases'} MDR risk
            </p>
          </div>
        )}
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-2 px-5 py-3 bg-[var(--bg-tertiary)]/50">
        <Info className="w-3.5 h-3.5 text-[var(--text-muted)] flex-shrink-0 mt-0.5" />
        <p className="text-xs text-[var(--text-muted)] leading-relaxed">
          <strong className="text-[var(--text-secondary)]">Decision support only.</strong>{' '}
          Not a diagnosis. Confirm with laboratory culture and susceptibility results before
          changing treatment.
        </p>
      </div>
    </div>
  );
}

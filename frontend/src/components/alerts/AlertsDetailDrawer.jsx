import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  X, AlertTriangle, MapPin, Beaker, Clock, Check, User as UserIcon,
  ExternalLink, Send, Sparkles, Brain, TrendingUp, TrendingDown, Loader2,
} from 'lucide-react';
import api from '../../api/client';
import { formatPercent, formatDateTime, timeAgo } from '../../lib/format';

function SectionCard({ title, icon: Icon, children, tone = 'default' }) {
  const toneClass = {
    default: 'border-[var(--border-primary)] bg-[var(--bg-secondary)]',
    info: 'border-[var(--status-info-border)] bg-[var(--status-info-bg)]',
    warning: 'border-[var(--status-warning-border)] bg-[var(--status-warning-bg)]',
  }[tone];
  return (
    <section className={`rounded-[var(--radius-card)] border ${toneClass} p-4`}>
      {title && (
        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2 flex items-center gap-1.5">
          {Icon && <Icon className="w-3 h-3" />}
          {title}
        </h3>
      )}
      {children}
    </section>
  );
}

function ExplanationBlock({ explanation }) {
  if (!explanation) return null;

  // The backend returns either { features: [...] } or a list of { feature, value }
  const rows = Array.isArray(explanation)
    ? explanation
    : Array.isArray(explanation.features)
      ? explanation.features
      : [];

  if (rows.length === 0) {
    return (
      <p className="text-xs text-[var(--text-muted)] italic">
        No detailed feature breakdown available for this record.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {rows.slice(0, 6).map((row, i) => {
        const name = row.feature || row.name || row.label || `Feature ${i + 1}`;
        const value = Number(row.value ?? row.shap_value ?? row.contribution ?? 0);
        const positive = value >= 0;
        const width = Math.min(Math.abs(value) * 100, 100);
        return (
          <li key={`${name}-${i}`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-mono text-[var(--text-primary)] truncate pr-2">
                {name}
              </span>
              <span
                className={`text-xs font-semibold tabular-nums flex-shrink-0 ${
                  positive ? 'text-[var(--status-critical)]' : 'text-[var(--status-success)]'
                }`}
              >
                {positive ? '+' : ''}
                {value.toFixed(3)}
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  positive ? 'bg-[var(--status-critical)]' : 'bg-[var(--status-success)]'
                }`}
                style={{ width: `${width}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export default function AlertsDetailDrawer({ alert, onClose }) {
  const qc = useQueryClient();
  const [note, setNote] = useState('');
  const [assignee, setAssignee] = useState(alert?.assigned_to || '');
  const [guidanceText, setGuidanceText] = useState(null);

  // SHAP explanation — auto-loaded
  const { data: explanation, isLoading: explanationLoading } = useQuery({
    queryKey: ['alert-explanation', alert?.id],
    queryFn: () => api.getAlertExplanation(alert.id),
    enabled: !!alert?.id,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  // LLM guidance — on demand
  const guidanceMutation = useMutation({
    mutationFn: () => api.generateLLM(alert.id),
    onSuccess: (res) => {
      setGuidanceText(res?.text || 'No guidance generated.');
    },
    onError: () => {
      setGuidanceText('Could not generate guidance. Try again in a moment.');
      toast.error('Guidance generation failed');
    },
  });

  const acknowledgeMutation = useMutation({
    mutationFn: () => api.acknowledgeAlert(alert.id),
    onSuccess: () => {
      toast.success('Alert acknowledged');
      qc.invalidateQueries({ queryKey: ['alerts'] });
      qc.invalidateQueries({ queryKey: ['alerts-stats'] });
      onClose();
    },
    onError: () => toast.error('Failed to acknowledge'),
  });

  const resolveMutation = useMutation({
    mutationFn: () => api.resolveAlert(alert.id, { note }),
    onSuccess: () => {
      toast.success('Alert resolved');
      qc.invalidateQueries({ queryKey: ['alerts'] });
      qc.invalidateQueries({ queryKey: ['alerts-stats'] });
      onClose();
    },
    onError: () => toast.error('Failed to resolve'),
  });

  const assignMutation = useMutation({
    mutationFn: () => api.assignAlert(alert.id, assignee),
    onSuccess: () => {
      toast.success('Alert assigned');
      qc.invalidateQueries({ queryKey: ['alerts'] });
    },
    onError: () => toast.error('Failed to assign'),
  });

  if (!alert) return null;

  const sevClass = {
    critical: 'bg-[var(--status-critical-bg)] border-[var(--status-critical-border)] text-[var(--status-critical)]',
    high: 'bg-[var(--status-warning-bg)] border-[var(--status-warning-border)] text-[var(--status-warning)]',
    medium: 'bg-[var(--status-info-bg)] border-[var(--status-info-border)] text-[var(--status-info)]',
    low: 'bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--text-secondary)]',
  }[alert.severity] || 'bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--text-secondary)]';

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[900]" onClick={onClose} />
      <aside
        role="dialog"
        aria-modal="true"
        className="fixed z-[1000] top-3 right-3 bottom-3 left-3 sm:top-4 sm:right-4 sm:bottom-4 sm:left-auto sm:w-[600px] lg:w-[680px] max-w-[calc(100vw-1.5rem)] rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-primary)] shadow-2xl overflow-hidden flex flex-col"
      >
        <header className="flex items-start justify-between gap-3 px-5 py-4 border-b border-[var(--border-primary)] bg-[var(--bg-secondary)]">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0" />
              <h2 className="text-base font-bold text-[var(--text-primary)] truncate">
                {alert.pathogen_code || 'Unknown isolate'}
              </h2>
              <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${sevClass}`}>
                {alert.severity}
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              <span title={formatDateTime(alert.timestamp)}>{timeAgo(alert.timestamp)}</span>
              {' · '}
              {alert.type === 'anomaly' ? 'Anomaly' : 'High MDR probability'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition flex-shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <SectionCard>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{alert.message}</p>
          </SectionCard>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">
                MDR probability
              </p>
              <p className="text-2xl font-bold tabular-nums text-[var(--status-critical)]">
                {formatPercent(alert.mdr_probability * 100)}
              </p>
            </div>
            <div className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">
                Anomaly score
              </p>
              <p className="text-2xl font-bold tabular-nums text-[var(--text-primary)]">
                {alert.anomaly_score.toFixed(3)}
              </p>
            </div>
          </div>

          <SectionCard>
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-[var(--text-primary)]">
                    {alert.county}{alert.sub_county ? ` · ${alert.sub_county}` : ''}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] capitalize">{alert.sector || '—'}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Beaker className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-[var(--text-primary)]">{alert.pathogen_code}</p>
                  <p className="text-xs text-[var(--text-muted)] font-mono">
                    {alert.record_id?.slice(0, 16)}…
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0 mt-0.5" />
                <p className="text-sm text-[var(--text-secondary)]">
                  {formatDateTime(alert.timestamp)}
                </p>
              </div>
            </div>
          </SectionCard>

          {/* Model explanation */}
          <SectionCard
            title="Model explanation"
            icon={Brain}
          >
            {alert.shap_summary && (
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed mb-3">
                {alert.shap_summary}
              </p>
            )}
            {explanationLoading ? (
              <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                <Loader2 className="w-3 h-3 animate-spin" />
                Loading feature breakdown…
              </div>
            ) : (
              <ExplanationBlock explanation={explanation} />
            )}
          </SectionCard>

          {/* LLM clinical guidance */}
          <SectionCard title="Clinical guidance" icon={Sparkles} tone="info">
            {!guidanceText && !guidanceMutation.isPending && (
              <>
                <p className="text-xs text-[var(--text-secondary)] mb-3 leading-relaxed">
                  Generate a plain-language summary with stewardship recommendations
                  based on this alert's pathogen and resistance pattern.
                </p>
                <button
                  onClick={() => guidanceMutation.mutate()}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-btn)] bg-[var(--accent-teal)] text-white text-sm font-medium hover:bg-[var(--accent-teal-hover)] transition"
                >
                  <Sparkles className="w-4 h-4" />
                  Generate guidance
                </button>
              </>
            )}

            {guidanceMutation.isPending && (
              <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <Loader2 className="w-4 h-4 animate-spin text-[var(--accent-teal)]" />
                Generating clinical guidance…
              </div>
            )}

            {guidanceText && (
              <div className="space-y-3">
                <div className="text-sm text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">
                  {guidanceText}
                </div>
                <button
                  onClick={() => {
                    setGuidanceText(null);
                    guidanceMutation.reset();
                  }}
                  className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  Regenerate
                </button>
              </div>
            )}
          </SectionCard>

          <Link
            to={`/history?record=${alert.record_id}`}
            className="inline-flex items-center gap-2 text-sm text-[var(--accent-teal)] hover:underline"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Open full record in History
          </Link>

          {!alert.acknowledged && (
            <button
              onClick={() => acknowledgeMutation.mutate()}
              disabled={acknowledgeMutation.isPending}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-[var(--radius-btn)] bg-[var(--accent-teal)] hover:bg-[var(--accent-teal-hover)] text-white text-sm font-medium transition disabled:opacity-60"
            >
              <Check className="w-4 h-4" />
              {acknowledgeMutation.isPending ? 'Acknowledging…' : 'Acknowledge alert'}
            </button>
          )}

          {alert.acknowledged && !alert.resolved && (
            <SectionCard title="Resolve this alert">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add a resolution note (optional)…"
                rows={3}
                className="w-full rounded-[var(--radius-input)] border border-[var(--border-primary)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)] resize-none focus:outline-none focus:border-[var(--accent-teal)] mb-3"
              />
              <button
                onClick={() => resolveMutation.mutate()}
                disabled={resolveMutation.isPending}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-btn)] bg-[var(--status-success)] text-white text-sm font-medium hover:opacity-90 transition disabled:opacity-60"
              >
                <Check className="w-4 h-4" />
                {resolveMutation.isPending ? 'Resolving…' : 'Mark as resolved'}
              </button>
            </SectionCard>
          )}

          <SectionCard title="Assign to reviewer">
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                placeholder="Name or email"
                className="flex-1 rounded-[var(--radius-input)] border border-[var(--border-primary)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-teal)]"
              />
              <button
                onClick={() => assignMutation.mutate()}
                disabled={assignMutation.isPending || !assignee.trim()}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[var(--radius-btn)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] text-sm font-medium hover:bg-[var(--bg-tertiary)] disabled:opacity-50 transition"
              >
                <Send className="w-3.5 h-3.5" />
                Assign
              </button>
            </div>
            {alert.assigned_to && (
              <p className="text-xs text-[var(--text-muted)] inline-flex items-center gap-1">
                <UserIcon className="w-3 h-3" />
                Currently assigned to <strong className="text-[var(--text-secondary)]">{alert.assigned_to}</strong>
              </p>
            )}
          </SectionCard>

          {(alert.acknowledged_at || alert.resolved_at) && (
            <SectionCard title="History">
              {alert.acknowledged_at && (
                <p className="text-xs text-[var(--text-secondary)]">
                  Acknowledged by <strong>{alert.acknowledged_by}</strong> — {formatDateTime(alert.acknowledged_at)}
                </p>
              )}
              {alert.resolved_at && (
                <div className="mt-2">
                  <p className="text-xs text-[var(--text-secondary)]">
                    Resolved by <strong>{alert.resolved_by}</strong> — {formatDateTime(alert.resolved_at)}
                  </p>
                  {alert.resolution_note && (
                    <p className="text-xs text-[var(--text-muted)] mt-1 italic">
                      "{alert.resolution_note}"
                    </p>
                  )}
                </div>
              )}
            </SectionCard>
          )}
        </div>
      </aside>
    </>
  );
}

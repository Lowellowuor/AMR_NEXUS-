import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { confirmOutcome } from '../../api/endpoints';
import { CheckCircle2, XCircle, Microscope } from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  X, MapPin, Beaker, Calendar, Activity, AlertTriangle,
  TrendingUp, TrendingDown, MessageSquare, Send, Trash2,
} from 'lucide-react';

import api from '../../api/client';
import LLMInsight from '../ui/LLMInsight';
import { formatPercent, formatDateTime, formatNumber, timeAgo } from '../../lib/format';

function Badge({ tone = 'neutral', children }) {
  const tones = {
    neutral: 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border-[var(--border-primary)]',
    critical: 'bg-[var(--status-critical-bg)] text-[var(--status-critical)] border-[var(--status-critical-border)]',
    warning: 'bg-[var(--status-warning-bg)] text-[var(--status-warning)] border-[var(--status-warning-border)]',
    success: 'bg-[var(--status-success-bg)] text-[var(--status-success)] border-[var(--status-success-border)]',
    info: 'bg-[var(--status-info-bg)] text-[var(--status-info)] border-[var(--status-info-border)]',
  };
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${tones[tone]}`}>
      {children}
    </span>
  );
}

function Section({ icon: Icon, title, children }) {
  return (
    <section className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)]">
      <header className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border-primary)]">
        {Icon && <Icon className="w-4 h-4 text-[var(--text-muted)]" />}
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          {title}
        </h3>
      </header>
      <div className="px-4 py-4">{children}</div>
    </section>
  );
}

function Field({ label, value, mono = false }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">
        {label}
      </p>
      <p className={`text-sm text-[var(--text-primary)] ${mono ? 'font-mono text-xs break-all' : ''}`}>
        {value || '-'}
      </p>
    </div>
  );
}

function RiskDial({ value }) {
  const pct = Math.min(Math.max(value, 0), 100);
  const tone = pct >= 60 ? 'critical' : pct >= 30 ? 'warning' : 'success';
  const colors = {
    critical: 'var(--status-critical)',
    warning: 'var(--status-warning)',
    success: 'var(--status-success)',
  };
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="relative w-32 h-32 flex-shrink-0">
      <svg className="w-32 h-32 -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="var(--bg-tertiary)" strokeWidth="8" />
        <circle
          cx="50" cy="50" r={radius}
          fill="none" stroke={colors[tone]} strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold tabular-nums text-[var(--text-primary)]">
          {pct.toFixed(1)}%
        </span>
        <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
          MDR probability
        </span>
      </div>
    </div>
  );
}

export default function HistoryDetailDrawer({ recordId, isAdmin, onClose, onDelete }) {
  const qc = useQueryClient();
  const [comment, setComment] = useState('');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['history-record', recordId],
    queryFn: () => api.getPredictionDetail(recordId),
    enabled: !!recordId,
    staleTime: 60_000,
  });

  const { data: comments = [] } = useQuery({
    queryKey: ['history-comments', recordId],
    queryFn: () => api.getComments(recordId),
    enabled: !!recordId,
    staleTime: 30_000,
  });

  const outcomeMutation = useMutation({
    mutationFn: ({ actualMdr, notes }) => confirmOutcome(recordId, actualMdr, notes),
    onSuccess: () => {
      toast.success('Outcome confirmed');
      qc.invalidateQueries({ queryKey: ['history-record', recordId] });
      qc.invalidateQueries({ queryKey: ['history'] });
      qc.invalidateQueries({ queryKey: ['ml-calib'] });
      qc.invalidateQueries({ queryKey: ['ml-perf'] });
    },
    onError: () => toast.error('Could not save outcome'),
  });

  const addCommentMutation = useMutation({
    mutationFn: (text) => api.addComment(recordId, { text, user_name: 'Current user' }),
    onSuccess: () => {
      setComment('');
      qc.invalidateQueries({ queryKey: ['history-comments', recordId] });
      toast.success('Comment added');
    },
    onError: () => toast.error('Failed to add comment'),
  });

  if (!recordId) return null;

  const shapAbs = data ? Math.abs(data.shap_value ?? 0) : 0;
  const shapPositive = (data?.shap_value ?? 0) >= 0;
  const shapWidth = Math.min(shapAbs * 100, 100);

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[900]"
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Record detail"
        className="
          fixed z-[1000]
          top-3 right-3 bottom-3 left-3
          sm:top-4 sm:right-4 sm:bottom-4 sm:left-auto sm:w-[560px]
          lg:w-[640px]
          max-w-[calc(100vw-1.5rem)]
          rounded-[var(--radius-card)]
          border border-[var(--border-primary)]
          bg-[var(--bg-primary)]
          shadow-2xl
          overflow-hidden
          flex flex-col
          animate-in
        "
      >
        <header className="flex items-start justify-between gap-3 px-5 py-4 border-b border-[var(--border-primary)] bg-[var(--bg-secondary)]">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <Beaker className="w-4 h-4 text-[var(--accent-teal)] flex-shrink-0" />
              <h2 className="text-base font-bold text-[var(--text-primary)] truncate">
                {data?.pathogen_code || 'Loading...'}
              </h2>
              {data?.mdr_flag && <Badge tone="critical">MDR</Badge>}
              {data?.anomaly_detected && (
                <Badge tone="warning">
                  <AlertTriangle className="w-3 h-3" />
                  Anomaly
                </Badge>
              )}
            </div>
            {data && (
              <p className="text-xs text-[var(--text-muted)]">
                {data.county}
                {data.sub_county ? `  -  ${data.sub_county}` : ''}
                {'  -  '}
                <span title={formatDateTime(data.timestamp)}>{timeAgo(data.timestamp)}</span>
              </p>
            )}
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
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 rounded-[var(--radius-card)] bg-[var(--bg-tertiary)] animate-pulse" />
              ))}
            </div>
          ) : isError || !data ? (
            <div className="text-center py-12">
              <p className="text-sm text-[var(--text-muted)]">Record not found</p>
            </div>
          ) : (
            <>
              <div className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-5 flex flex-col sm:flex-row items-center gap-5">
                <RiskDial value={(data.mdr_probability ?? 0) * 100} />
                <div className="flex-1 grid grid-cols-2 gap-3 w-full">
                  <Field label="Anomaly score" value={formatNumber(data.anomaly_score, 3)} />
                  <Field label="Model version" value={data.model_version} />
                  <Field label="Sample month" value={data.sample_month} />
                  <Field label="Sample date" value={data.sample_collection_date || '-'} />
                </div>
              </div>

              <Section icon={MapPin} title="Identification">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Record ID" value={data.record_id} mono />
                  <Field label="Submission type" value={data.submission_type} />
                  <Field label="County" value={data.county} />
                  <Field label="Sub-county" value={data.sub_county} />
                  <Field label="Sector" value={data.sector} />
                  <Field label="Sub-sector" value={data.sub_sector} />
                </div>
              </Section>

              <Section icon={Activity} title="Clinical details">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Antibiotic class" value={data.antibiotic_class} />
                  <Field label="Test method" value={data.test_method} />
                  <Field label="Specimen type" value={data.specimen_type} />
                  <Field label="SIR result" value={data.sir_result} />
                  <Field label="Prior antibiotic exposure" value={data.prior_antibiotic_exposure ? 'Yes' : 'No'} />
                  <Field label="Infection origin" value={data.infection_origin} />
                  <Field label="Ward type" value={data.ward_type} />
                  <Field label="Urban / rural" value={data.urban_rural} />
                </div>
              </Section>

              {(data.gene_marker_blandm || data.gene_marker_mcr1) && (
                <Section icon={AlertTriangle} title="Resistance markers">
                  <div className="flex flex-wrap gap-2">
                    {data.gene_marker_blandm && <Badge tone="critical">blaNDM</Badge>}
                    {data.gene_marker_mcr1 && <Badge tone="critical">mcr-1</Badge>}
                  </div>
                </Section>
              )}

              <Section icon={shapPositive ? TrendingUp : TrendingDown} title="Model explainability">
                <div className="space-y-3">
                  <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                    {data.shap_summary || 'No explanation available for this record.'}
                  </p>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-[var(--text-primary)] font-mono truncate pr-2">
                        {data.shap_top_feature || '-'}
                      </span>
                      <span
                        className={`text-xs font-semibold tabular-nums flex-shrink-0 ${
                          shapPositive ? 'text-[var(--status-critical)]' : 'text-[var(--status-success)]'
                        }`}
                      >
                        {shapPositive ? '+' : ''}
                        {(data.shap_value ?? 0).toFixed(3)}
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
                </div>
              </Section>

              <Section icon={MessageSquare} title={`Comments (${comments.length})`}>
                <div className="space-y-3">
                  {comments.length === 0 && (
                    <p className="text-xs text-[var(--text-muted)] text-center py-2">
                      No comments yet
                    </p>
                  )}
                  {comments.map((c) => (
                    <div key={c.id} className="rounded-lg bg-[var(--bg-tertiary)]/60 p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-[var(--text-primary)]">
                          {c.user_name}
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)]">
                          {timeAgo(c.created_at)}
                        </span>
                      </div>
                      <p className="text-sm text-[var(--text-secondary)]">{c.text}</p>
                    </div>
                  ))}
                  <div className="flex gap-2 pt-1">
                    <input
                      type="text"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Add a clinical note..."
                      className="flex-1 rounded-[var(--radius-input)] border border-[var(--border-primary)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-teal)]"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && comment.trim()) {
                          addCommentMutation.mutate(comment.trim());
                        }
                      }}
                    />
                    <button
                      onClick={() => comment.trim() && addCommentMutation.mutate(comment.trim())}
                      disabled={!comment.trim() || addCommentMutation.isPending}
                      className="px-3 py-2 rounded-[var(--radius-btn)] bg-[var(--accent-teal)] text-white disabled:opacity-50 hover:bg-[var(--accent-teal-hover)] transition"
                      aria-label="Post comment"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </Section>

              <Section icon={Microscope} title="Laboratory confirmation">
                {data.lab_confirmed_mdr === null || data.lab_confirmed_mdr === undefined ? (
                  <>
                    <p className="text-xs text-[var(--text-muted)] mb-3 leading-relaxed">
                      Confirm the actual laboratory result for this isolate. Confirmed
                      outcomes feed the model's calibration and improve future predictions.
                    </p>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <button
                        onClick={() => outcomeMutation.mutate({ actualMdr: true, notes: '' })}
                        disabled={outcomeMutation.isPending}
                        className="inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-[var(--radius-btn)] bg-[var(--status-critical-bg)] border border-[var(--status-critical-border)] text-[var(--status-critical)] text-sm font-semibold hover:opacity-90 transition disabled:opacity-50"
                      >
                        <XCircle className="w-4 h-4" />
                        MDR confirmed
                      </button>
                      <button
                        onClick={() => outcomeMutation.mutate({ actualMdr: false, notes: '' })}
                        disabled={outcomeMutation.isPending}
                        className="inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-[var(--radius-btn)] bg-[var(--status-success-bg)] border border-[var(--status-success-border)] text-[var(--status-success)] text-sm font-semibold hover:opacity-90 transition disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Susceptible confirmed
                      </button>
                    </div>
                  </>
                ) : (
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      {data.lab_confirmed_mdr ? (
                        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--status-critical)]">
                          <XCircle className="w-4 h-4" />
                          MDR confirmed by laboratory
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--status-success)]">
                          <CheckCircle2 className="w-4 h-4" />
                          Susceptible confirmed by laboratory
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[var(--text-muted)] space-y-0.5 mb-2">
                      <p>Confirmed by {data.outcome_confirmed_by || 'unknown'}</p>
                      <p>{data.outcome_confirmed_at ? formatDateTime(data.outcome_confirmed_at) : '-'}</p>
                    </div>
                    <div
                      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${
                        (data.mdr_flag === data.lab_confirmed_mdr)
                          ? 'bg-[var(--status-success-bg)] text-[var(--status-success)] border-[var(--status-success-border)]'
                          : 'bg-[var(--status-warning-bg)] text-[var(--status-warning)] border-[var(--status-warning-border)]'
                      }`}
                    >
                      {(data.mdr_flag === data.lab_confirmed_mdr) ? 'Prediction matched' : 'Prediction did not match'}
                    </div>
                    {data.outcome_notes && (
                      <p className="text-xs text-[var(--text-secondary)] mt-3 italic">
                        &ldquo;{data.outcome_notes}&rdquo;
                      </p>
                    )}
                  </div>
                )}
              </Section>

              <Section icon={Calendar} title="Metadata">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Recorded" value={formatDateTime(data.timestamp)} />
                  <Field label="Last updated" value={formatDateTime(data.updated_at)} />
                </div>
              </Section>

              <LLMInsight
                context="prediction record"
                title="Clinical interpretation"
                data={{
                  pathogen: data.pathogen_code,
                  county: data.county,
                  sector: data.sector,
                  specimen: data.specimen_type,
                  antibiotic_class: data.antibiotic_class,
                  mdr_flag: data.mdr_flag,
                  mdr_probability: data.mdr_probability,
                  anomaly_flag: data.anomaly_detected,
                  anomaly_score: data.anomaly_score,
                  shap_summary: data.shap_summary,
                }}
              />

              {isAdmin && (
                <div className="rounded-[var(--radius-card)] border border-[var(--status-critical-border)] bg-[var(--status-critical-bg)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--status-critical)] mb-3">
                    Administrator actions
                  </p>
                  <button
                    onClick={() => onDelete(data.record_id)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-btn)] bg-[var(--status-critical)] text-white text-sm font-medium hover:opacity-90 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete record
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </aside>
    </>
  );
}

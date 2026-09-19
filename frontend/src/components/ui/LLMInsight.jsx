import { useEffect, useState } from 'react';
import { Sparkles, RefreshCw, Copy, Check, AlertCircle, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useLLMInsight } from '../../hooks/useLLMInsight';

export default function LLMInsight({
  context,
  data,
  title = 'AI summary',
  autoLoad = false,
  cacheKey,
  className = '',
}) {
  const mutation = useLLMInsight();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (autoLoad && !mutation.data && !mutation.isPending && !mutation.isError) {
      mutation.mutate({ context, data, cacheKey });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLoad, context, cacheKey]);

  const handleCopy = async () => {
    if (!mutation.data?.text) return;
    try {
      await navigator.clipboard.writeText(mutation.data.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  };

  return (
    <section
      aria-label={title}
      className={`rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] overflow-hidden ${className}`}
    >
      <header className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-primary)]">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="w-4 h-4 text-[var(--accent-teal)] flex-shrink-0" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] truncate">
            {title}
          </h3>
        </div>
        <div className="flex items-center gap-1">
          {mutation.data?.text && (
            <button
              onClick={handleCopy}
              className="p-1.5 rounded text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition"
              aria-label="Copy insight"
              title="Copy"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[var(--status-success)]" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          )}
          {mutation.data?.text && (
            <button
              onClick={() => mutation.mutate({ context, data, cacheKey })}
              disabled={mutation.isPending}
              className="p-1.5 rounded text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)] transition disabled:opacity-40"
              aria-label="Regenerate"
              title="Regenerate"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${mutation.isPending ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
      </header>

      <div className="px-4 py-4">
        {!mutation.data && !mutation.isPending && !mutation.isError && (
          <div className="flex flex-col items-start gap-3">
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Generate a plain-language interpretation of this data. Useful for briefings,
              reports, and clinical handover.
            </p>
            <button
              onClick={() => mutation.mutate({ context, data, cacheKey })}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-[var(--radius-btn)] bg-[var(--accent-teal)] text-white text-xs font-semibold hover:bg-[var(--accent-teal-hover)] transition"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Generate summary
            </button>
          </div>
        )}

        {mutation.isPending && (
          <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)] py-2">
            <Loader2 className="w-4 h-4 animate-spin text-[var(--accent-teal)]" />
            Generating interpretation...
          </div>
        )}

        {mutation.isError && (
          <div className="flex items-start gap-2 py-2">
            <AlertCircle className="w-4 h-4 text-[var(--status-critical)] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-[var(--status-critical)] font-medium">
                Could not generate summary
              </p>
              <button
                onClick={() => mutation.mutate({ context, data, cacheKey })}
                className="text-xs text-[var(--accent-teal)] hover:underline mt-1"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {mutation.data?.text && (
          <div className="prose prose-sm max-w-none text-[var(--text-primary)]">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h2: ({ children }) => (
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mt-4 mb-2 first:mt-0">
                    {children}
                  </h4>
                ),
                p: ({ children }) => (
                  <p className="text-sm leading-relaxed mb-2">{children}</p>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc pl-5 space-y-1 mb-2 text-sm">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal pl-5 space-y-1 mb-2 text-sm">{children}</ol>
                ),
                li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                strong: ({ children }) => (
                  <strong className="font-semibold text-[var(--text-primary)]">{children}</strong>
                ),
              }}
            >
              {mutation.data.text}
            </ReactMarkdown>
          </div>
        )}
      </div>

      {mutation.data?.text && (
        <div className="px-4 py-2 border-t border-[var(--border-primary)] bg-[var(--bg-tertiary)]/30">
          <p className="text-[10px] text-[var(--text-muted)]">
            AI-generated. Verify against source data before acting.
          </p>
        </div>
      )}
    </section>
  );
}

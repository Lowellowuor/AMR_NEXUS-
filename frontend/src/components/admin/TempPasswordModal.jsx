import { useState } from 'react';
import { X, Copy, Check, AlertTriangle } from 'lucide-react';

export default function TempPasswordModal({ open, email, password, onClose }) {
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable; user can select manually
    }
  };

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-md rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] shadow-2xl"
      >
        <div className="flex items-start justify-between px-5 pt-5 pb-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--status-warning-bg)] text-[var(--status-warning)] flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[var(--text-primary)]">
                Temporary password
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Shown once. Copy it now and share securely.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)]"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 pb-4 space-y-3">
          {email && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">
                User
              </label>
              <p className="text-sm text-[var(--text-primary)]">{email}</p>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">
              Password
            </label>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg px-3 py-2 text-sm font-mono break-all">
                {password}
              </code>
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1 px-3 py-2 rounded-full border border-[var(--border-primary)] text-sm hover:bg-[var(--bg-tertiary)]"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-[var(--status-success)]" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy
                  </>
                )}
              </button>
            </div>
          </div>

          <p className="text-xs text-[var(--text-muted)]">
            The user will be required to change this password on first sign-in.
          </p>
        </div>

        <div className="flex justify-end px-5 pb-5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-full bg-[var(--accent-teal)] text-white text-sm font-medium"
          >
            I&apos;ve saved it
          </button>
        </div>
      </div>
    </div>
  );
}
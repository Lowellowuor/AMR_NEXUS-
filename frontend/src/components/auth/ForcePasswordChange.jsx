import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { KeyRound, Check, X, Loader2, ShieldAlert } from 'lucide-react';
import { forceChangePassword } from '../../api/endpoints';
import { useAuth } from '../../contexts/AuthContext';

function strength(password) {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score <= 2) return { level: 'weak', tone: 'critical', label: 'Weak' };
  if (score <= 4) return { level: 'medium', tone: 'warning', label: 'Moderate' };
  return { level: 'strong', tone: 'success', label: 'Strong' };
}

export default function ForcePasswordChange() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');

  const mutation = useMutation({
    mutationFn: () => forceChangePassword(newPw),
    onSuccess: () => {
      toast.success('Password set. Please sign in with your new password.');
      setTimeout(() => {
        logout();
        navigate('/login', { replace: true });
      }, 1200);
    },
    onError: (e) => toast.error(e.message || 'Failed to set password'),
  });

  const s = strength(newPw);
  const mismatch = confirmPw && newPw !== confirmPw;
  const canSubmit = newPw.length >= 8 && newPw === confirmPw;

  const toneBar = {
    weak: 'bg-[var(--status-critical)] w-1/4',
    medium: 'bg-[var(--status-warning)] w-2/4',
    strong: 'bg-[var(--status-success)] w-full',
  }[s.level];

  return (
    <div className="fixed inset-0 z-[2000] bg-[var(--bg-primary)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] shadow-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--border-primary)] bg-[var(--status-warning-bg)]">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-[var(--status-warning)]/20 flex items-center justify-center flex-shrink-0">
                <ShieldAlert className="w-5 h-5 text-[var(--status-warning)]" />
              </div>
              <div>
                <h1 className="text-base font-bold text-[var(--text-primary)]">
                  Set a new password
                </h1>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                  Your administrator created this account with a temporary password.
                  You must set a permanent password before continuing.
                </p>
              </div>
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (canSubmit) mutation.mutate();
            }}
            className="p-5 space-y-4"
          >
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                New password
              </span>
              <input
                type="password"
                autoFocus
                required
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                autoComplete="new-password"
                className="rounded-[var(--radius-input)] border border-[var(--border-primary)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)]"
              />
            </label>

            {newPw && (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="flex-1 h-1.5 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                    <div className={`h-full rounded-full ${toneBar} transition-all`} />
                  </div>
                  <span className={`text-xs font-semibold text-[var(--status-${s.tone})]`}>{s.label}</span>
                </div>
                <p className="text-xs text-[var(--text-muted)]">
                  At least 8 characters with mixed case, a number, and a symbol.
                </p>
              </div>
            )}

            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Confirm password
              </span>
              <input
                type="password"
                required
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                autoComplete="new-password"
                className="rounded-[var(--radius-input)] border border-[var(--border-primary)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)]"
              />
            </label>

            {mismatch && (
              <p className="text-xs text-[var(--status-critical)] flex items-center gap-1">
                <X className="w-3 h-3" /> Passwords do not match
              </p>
            )}

            <button
              type="submit"
              disabled={!canSubmit || mutation.isPending}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-[var(--radius-btn)] bg-[var(--accent-teal)] text-white text-sm font-semibold hover:bg-[var(--accent-teal-hover)] transition disabled:opacity-50"
            >
              {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
              Set password
            </button>

            <button
              type="button"
              onClick={() => {
                logout();
                navigate('/login', { replace: true });
              }}
              className="w-full text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition"
            >
              Sign out instead
            </button>
          </form>
        </div>

        <p className="text-xs text-[var(--text-muted)] text-center mt-4">
          Data Protection Act 2019 · Republic of Kenya
        </p>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { KeyRound, Monitor, LogOut, Check, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { formatDateTime, timeAgo } from '../../lib/format';

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

export default function SecuritySection() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');

  const { data: sessions } = useQuery({
    queryKey: ['my-sessions'],
    queryFn: () => api.getMySessions(),
    staleTime: 30_000,
  });

  const changeMutation = useMutation({
    mutationFn: () => api.changePassword(oldPw, newPw),
    onSuccess: () => {
      toast.success('Password changed. Please sign in again.');
      setOldPw(''); setNewPw(''); setConfirmPw('');
      setTimeout(() => { logout(); navigate('/login', { replace: true }); }, 1200);
    },
    onError: (e) => toast.error(e.message || 'Failed to change password'),
  });

  const logoutAllMutation = useMutation({
    mutationFn: () => api.logoutAll(),
    onSuccess: () => {
      toast.success('All sessions invalidated. Please sign in again.');
      setTimeout(() => { logout(); navigate('/login', { replace: true }); }, 1200);
    },
    onError: () => toast.error('Failed to sign out everywhere'),
  });

  const s = strength(newPw);
  const mismatch = confirmPw && newPw !== confirmPw;
  const canSubmit = oldPw && newPw.length >= 8 && newPw === confirmPw && newPw !== oldPw;

  const toneBar = {
    weak: 'bg-[var(--status-critical)] w-1/4',
    medium: 'bg-[var(--status-warning)] w-2/4',
    strong: 'bg-[var(--status-success)] w-full',
  }[s.level];

  return (
    <div className="space-y-5">
      <div className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-5">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-[var(--accent-teal)]" />
          Change password
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Current</span>
            <input
              type="password"
              value={oldPw}
              onChange={(e) => setOldPw(e.target.value)}
              autoComplete="current-password"
              className="rounded-[var(--radius-input)] border border-[var(--border-primary)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)]"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">New</span>
            <input
              type="password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              autoComplete="new-password"
              className="rounded-[var(--radius-input)] border border-[var(--border-primary)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)]"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Confirm</span>
            <input
              type="password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              autoComplete="new-password"
              className="rounded-[var(--radius-input)] border border-[var(--border-primary)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)]"
            />
          </label>
        </div>

        {newPw && (
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="flex-1 h-1.5 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                <div className={`h-full rounded-full ${toneBar} transition-all`} />
              </div>
              <span className={`text-xs font-semibold text-[var(--status-${s.tone})]`}>{s.label}</span>
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              Use at least 8 characters with mixed case, a digit, and a symbol.
            </p>
          </div>
        )}

        {mismatch && (
          <p className="text-xs text-[var(--status-critical)] mb-3 flex items-center gap-1">
            <X className="w-3 h-3" /> Passwords do not match
          </p>
        )}

        <button
          onClick={() => changeMutation.mutate()}
          disabled={!canSubmit || changeMutation.isPending}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-btn)] bg-[var(--accent-teal)] text-white text-sm font-medium hover:bg-[var(--accent-teal-hover)] transition disabled:opacity-50"
        >
          <Check className="w-4 h-4" />
          {changeMutation.isPending ? 'Updating...' : 'Update password'}
        </button>
      </div>

      <div className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <Monitor className="w-4 h-4 text-[var(--accent-teal)]" />
            Recent sign-ins
          </h3>
          <button
            onClick={() => logoutAllMutation.mutate()}
            disabled={logoutAllMutation.isPending}
            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-[var(--status-critical-border)] bg-[var(--status-critical-bg)] text-[var(--status-critical)] hover:opacity-90 transition disabled:opacity-50"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out everywhere
          </button>
        </div>

        {!sessions || sessions.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)]">No sign-in history available.</p>
        ) : (
          <ul className="space-y-2">
            {sessions.slice(0, 5).map((s2) => (
              <li key={s2.id} className="flex items-start justify-between gap-3 py-2 border-b border-[var(--border-primary)] last:border-0">
                <div className="min-w-0">
                  <p className="text-sm text-[var(--text-primary)]">
                    {timeAgo(s2.occurred_at)}
                    <span className="text-xs text-[var(--text-muted)] ml-2">
                      {formatDateTime(s2.occurred_at)}
                    </span>
                  </p>
                  <p className="text-xs text-[var(--text-muted)] truncate">
                    {s2.ip_address || '-'}
                    {' - '}
                    <span className="text-[10px]">{(s2.user_agent || '').slice(0, 60)}</span>
                  </p>
                </div>
                <span className={`text-xs font-semibold ${s2.result === 'success' ? 'text-[var(--status-success)]' : 'text-[var(--status-critical)]'}`}>
                  {s2.result}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { usePageTitle } from '../hooks/usePageTitle';

export default function Login() {
  usePageTitle('Sign in');
  const { login, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const redirectTo = location.state?.from?.pathname || '/';

  if (!loading && isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.message || 'Unable to sign in');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[var(--bg-primary)]">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-[var(--accent-teal)] flex items-center justify-center mb-4">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">AMR Nexus</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Antimicrobial Resistance Surveillance Platform
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] shadow-[var(--shadow-md)] p-6 space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="username"
              className="w-full rounded-[var(--radius-input)] border border-[var(--border-primary)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-teal)] focus:ring-2 focus:ring-[var(--accent-teal)]/20"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full rounded-[var(--radius-input)] border border-[var(--border-primary)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-teal)] focus:ring-2 focus:ring-[var(--accent-teal)]/20"
            />
          </div>

          {error && (
            <div
              role="alert"
              className="text-sm rounded-lg px-3 py-2 bg-[var(--status-critical-bg)] text-[var(--status-critical)] border border-[var(--status-critical-border)]"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 rounded-[var(--radius-btn)] bg-[var(--accent-teal)] hover:opacity-90 text-white font-semibold py-2.5 text-sm transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign in'
            )}
          </button>
        </form>

        <p className="text-xs text-[var(--text-muted)] text-center mt-6">
          Data Protection Act 2019 compliant  -  Republic of Kenya
        </p>
      </div>
    </div>
  );
}

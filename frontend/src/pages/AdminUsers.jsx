import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import {
  Users, UserPlus, Search, Copy, Check, RefreshCw, Ban, PowerOff,
  Shield, ShieldAlert, X, Loader2, KeyRound, Eye, EyeOff,
} from 'lucide-react';

import { listUsers, createUser, updateUser, resetUserPassword, disableUser, getOptions } from '../api/endpoints';
import { usePageTitle } from '../hooks/usePageTitle';
import { useAuth } from '../contexts/AuthContext';
import { formatDateTime, timeAgo } from '../lib/format';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import { SkeletonTable } from '../components/ui/Skeleton';

const ROLES = [
  { value: 'admin', label: 'Administrator', description: 'Full system access, user management, audit log' },
  { value: 'analyst', label: 'Analyst', description: 'View data, run analytics, create reports' },
  { value: 'clinician', label: 'Clinician', description: 'Submit predictions, view records, add notes' },
  { value: 'viewer', label: 'Viewer', description: 'Read-only access to dashboards' },
];

function RoleBadge({ role }) {
  const map = {
    admin: 'bg-[var(--status-critical-bg)] text-[var(--status-critical)] border-[var(--status-critical-border)]',
    analyst: 'bg-[var(--accent-teal)]/10 text-[var(--accent-teal)] border-[var(--accent-teal)]/30',
    clinician: 'bg-[var(--status-info-bg)] text-[var(--status-info)] border-[var(--status-info-border)]',
    viewer: 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border-[var(--border-primary)]',
  };
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${map[role] || map.viewer}`}>
      {role}
    </span>
  );
}

function StatusBadge({ active }) {
  return active ? (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--status-success-bg)] text-[var(--status-success)] border border-[var(--status-success-border)]">
      Active
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--status-critical-bg)] text-[var(--status-critical)] border border-[var(--status-critical-border)]">
      Disabled
    </span>
  );
}

function CreateUserModal({ open, onClose, onCreated, counties }) {
  const [form, setForm] = useState({
    email: '',
    name: '',
    role: 'analyst',
    assigned_county: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const mutation = useMutation({
    mutationFn: (data) => createUser(data),
    onSuccess: (res) => {
      setResult(res);
      onCreated?.(res);
    },
    onError: (e) => toast.error(e.message || 'Could not create user'),
  });

  const handleClose = () => {
    setForm({ email: '', name: '', role: 'analyst', assigned_county: '' });
    setResult(null);
    setCopied(false);
    onClose();
  };

  const copyPassword = () => {
    if (!result?.temp_password) return;
    navigator.clipboard.writeText(result.temp_password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative w-full max-w-lg rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] shadow-2xl">
        <header className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-primary)]">
          <div className="flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-[var(--accent-teal)]" />
            <h2 className="text-base font-bold text-[var(--text-primary)]">
              {result ? 'User created' : 'Create user'}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {result ? (
          <div className="p-5 space-y-4">
            <div className="rounded-lg border border-[var(--status-success-border)] bg-[var(--status-success-bg)] p-4">
              <div className="flex items-center gap-2 mb-2">
                <Check className="w-4 h-4 text-[var(--status-success)]" />
                <p className="text-sm font-semibold text-[var(--status-success)]">
                  {result.user.name} can now sign in
                </p>
              </div>
              <p className="text-xs text-[var(--text-secondary)]">
                Share these credentials securely. The user will be required to change
                the password on first sign-in.
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Email
              </label>
              <p className="text-sm font-mono text-[var(--text-primary)] mt-1">{result.user.email}</p>
            </div>

            <div>
              <label className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Temporary password
              </label>
              <div className="flex items-center gap-2 mt-1">
                <code className="flex-1 px-3 py-2 rounded-[var(--radius-input)] bg-[var(--bg-tertiary)] text-sm font-mono text-[var(--text-primary)] select-all">
                  {showPassword ? result.temp_password : '•'.repeat(result.temp_password.length)}
                </code>
                <button
                  onClick={() => setShowPassword((v) => !v)}
                  className="p-2 rounded-lg border border-[var(--border-primary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition"
                  title={showPassword ? 'Hide' : 'Show'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button
                  onClick={copyPassword}
                  className="p-2 rounded-lg border border-[var(--border-primary)] text-[var(--text-muted)] hover:text-[var(--accent-teal)] hover:bg-[var(--bg-tertiary)] transition"
                  title="Copy"
                >
                  {copied ? <Check className="w-4 h-4 text-[var(--status-success)]" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handleClose}
                className="px-4 py-2 rounded-[var(--radius-btn)] bg-[var(--accent-teal)] text-white text-sm font-semibold hover:bg-[var(--accent-teal-hover)] transition"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              mutation.mutate(form);
            }}
            className="p-5 space-y-4"
          >
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Full name
              </span>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="rounded-[var(--radius-input)] border border-[var(--border-primary)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)]"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Email
              </span>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="rounded-[var(--radius-input)] border border-[var(--border-primary)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)]"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Role
              </span>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="rounded-[var(--radius-input)] border border-[var(--border-primary)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)]"
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label} — {r.description}
                  </option>
                ))}
              </select>
            </label>

            {form.role !== 'admin' && (
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Assigned county (optional)
                </span>
                <select
                  value={form.assigned_county}
                  onChange={(e) => setForm({ ...form, assigned_county: e.target.value })}
                  className="rounded-[var(--radius-input)] border border-[var(--border-primary)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)]"
                >
                  <option value="">National scope</option>
                  {counties.map((c) => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                  ))}
                </select>
              </label>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 rounded-[var(--radius-btn)] border border-[var(--border-primary)] text-[var(--text-secondary)] text-sm font-medium hover:bg-[var(--bg-tertiary)] transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={mutation.isPending}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-btn)] bg-[var(--accent-teal)] text-white text-sm font-semibold hover:bg-[var(--accent-teal-hover)] transition disabled:opacity-60"
              >
                {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                Create user
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function AdminUsers() {
  usePageTitle('User Management');
  const { user: me } = useAuth();
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [resetResult, setResetResult] = useState(null);

  const { data: options } = useQuery({
    queryKey: ['admin-user-options'],
    queryFn: getOptions,
    staleTime: 10 * 60 * 1000,
  });

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users', search],
    queryFn: () => listUsers(search),
    staleTime: 30_000,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateUser(id, data),
    onSuccess: () => {
      toast.success('User updated');
      qc.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (e) => toast.error(e.message || 'Update failed'),
  });

  const resetMutation = useMutation({
    mutationFn: (id) => resetUserPassword(id),
    onSuccess: (res) => setResetResult(res),
    onError: () => toast.error('Reset failed'),
  });

  const disableMutation = useMutation({
    mutationFn: (id) => disableUser(id),
    onSuccess: () => {
      toast.success('User disabled');
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      setConfirmAction(null);
    },
    onError: (e) => toast.error(e.message || 'Failed'),
  });

  const counties = options?.counties || [];

  const handleRoleChange = (u, newRole) => {
    updateMutation.mutate({ id: u.id, data: { role: newRole } });
  };

  const handleCountyChange = (u, newCounty) => {
    updateMutation.mutate({ id: u.id, data: { assigned_county: newCounty || null } });
  };

  const handleToggleActive = (u) => {
    if (u.is_active) {
      setConfirmAction({ type: 'disable', user: u });
    } else {
      updateMutation.mutate({ id: u.id, data: { is_active: true } });
    }
  };

  const copyReset = () => {
    if (!resetResult?.temp_password) return;
    navigator.clipboard.writeText(resetResult.temp_password);
    toast.success('Copied');
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap justify-between items-start gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Users className="w-5 h-5 text-[var(--accent-teal)]" />
            User Management
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            Create accounts, assign roles, reset passwords, and manage access
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-btn)] bg-[var(--accent-teal)] text-white text-sm font-semibold hover:bg-[var(--accent-teal-hover)] transition"
        >
          <UserPlus className="w-4 h-4" />
          Add user
        </button>
      </div>

      <div className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full rounded-[var(--radius-input)] border border-[var(--border-primary)] bg-[var(--bg-primary)] pl-9 pr-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-teal)]"
          />
        </div>
      </div>

      <div className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] overflow-hidden">
        {isLoading ? (
          <div className="p-5"><SkeletonTable rows={5} cols={5} /></div>
        ) : users.length === 0 ? (
          <EmptyState
            icon={Users}
            title={search ? 'No users match' : 'No users yet'}
            description={search ? 'Try a different search.' : 'Click Add user to create the first account.'}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--bg-tertiary)] border-b border-[var(--border-primary)]">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-[var(--text-secondary)]">User</th>
                  <th className="text-left px-4 py-3 font-semibold text-[var(--text-secondary)]">Role</th>
                  <th className="text-left px-4 py-3 font-semibold text-[var(--text-secondary)]">County</th>
                  <th className="text-left px-4 py-3 font-semibold text-[var(--text-secondary)]">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-[var(--text-secondary)]">Last login</th>
                  <th className="text-right px-4 py-3 font-semibold text-[var(--text-secondary)]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-primary)]">
                {users.map((u) => {
                  const isMe = u.id === me?.id;
                  return (
                    <tr key={u.id} className="hover:bg-[var(--bg-tertiary)]/40">
                      <td className="px-4 py-3">
                        <div className="font-medium text-[var(--text-primary)]">
                          {u.name}
                          {isMe && <span className="ml-2 text-[10px] font-semibold text-[var(--text-muted)]">(you)</span>}
                        </div>
                        <div className="text-xs text-[var(--text-muted)]">{u.email}</div>
                        {u.must_change_password && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[var(--status-warning)] mt-1">
                            <KeyRound className="w-3 h-3" />
                            Must change password
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isMe ? (
                          <RoleBadge role={u.role} />
                        ) : (
                          <select
                            value={u.role}
                            onChange={(e) => handleRoleChange(u, e.target.value)}
                            disabled={updateMutation.isPending}
                            className="rounded-[var(--radius-input)] border border-[var(--border-primary)] bg-[var(--bg-primary)] px-2 py-1 text-xs text-[var(--text-primary)]"
                          >
                            {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                          </select>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {u.role === 'admin' ? (
                          <span className="text-xs text-[var(--text-muted)] italic">National</span>
                        ) : (
                          <select
                            value={u.assigned_county || ''}
                            onChange={(e) => handleCountyChange(u, e.target.value)}
                            disabled={updateMutation.isPending}
                            className="rounded-[var(--radius-input)] border border-[var(--border-primary)] bg-[var(--bg-primary)] px-2 py-1 text-xs text-[var(--text-primary)]"
                          >
                            <option value="">National</option>
                            {counties.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                          </select>
                        )}
                      </td>
                      <td className="px-4 py-3"><StatusBadge active={u.is_active} /></td>
                      <td className="px-4 py-3 text-xs text-[var(--text-muted)]">
                        {u.last_login_at ? timeAgo(u.last_login_at) : 'Never'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => resetMutation.mutate(u.id)}
                            disabled={resetMutation.isPending}
                            className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition disabled:opacity-50"
                            title="Reset password"
                          >
                            <RefreshCw className="w-3 h-3" />
                            Reset
                          </button>
                          {!isMe && (
                            <button
                              onClick={() => handleToggleActive(u)}
                              className={`inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg transition ${
                                u.is_active
                                  ? 'border border-[var(--status-critical-border)] bg-[var(--status-critical-bg)] text-[var(--status-critical)] hover:opacity-90'
                                  : 'border border-[var(--status-success-border)] bg-[var(--status-success-bg)] text-[var(--status-success)] hover:opacity-90'
                              }`}
                            >
                              {u.is_active ? <Ban className="w-3 h-3" /> : <PowerOff className="w-3 h-3" />}
                              {u.is_active ? 'Disable' : 'Enable'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CreateUserModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => qc.invalidateQueries({ queryKey: ['admin-users'] })}
        counties={counties}
      />

      {resetResult && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setResetResult(null)} />
          <div className="relative w-full max-w-md rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-5 shadow-2xl">
            <h3 className="text-base font-bold text-[var(--text-primary)] mb-2">Password reset</h3>
            <p className="text-xs text-[var(--text-muted)] mb-4">
              Share this temporary password with the user. They will be required to
              change it on next sign-in.
            </p>
            <div className="flex items-center gap-2 mb-4">
              <code className="flex-1 px-3 py-2 rounded-[var(--radius-input)] bg-[var(--bg-tertiary)] text-sm font-mono text-[var(--text-primary)] select-all">
                {resetResult.temp_password}
              </code>
              <button
                onClick={copyReset}
                className="p-2 rounded-lg border border-[var(--border-primary)] text-[var(--text-muted)] hover:text-[var(--accent-teal)] hover:bg-[var(--bg-tertiary)] transition"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setResetResult(null)}
                className="px-4 py-2 rounded-[var(--radius-btn)] bg-[var(--accent-teal)] text-white text-sm font-semibold hover:bg-[var(--accent-teal-hover)] transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmAction}
        title={`Disable ${confirmAction?.user?.name}?`}
        description="They will be signed out immediately and will not be able to sign in until re-enabled."
        confirmLabel="Disable user"
        destructive
        onConfirm={() => confirmAction && disableMutation.mutate(confirmAction.user.id)}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}

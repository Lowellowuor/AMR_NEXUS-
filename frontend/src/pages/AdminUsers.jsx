import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  UserPlus,
  Search,
  RefreshCw,
  Pencil,
  KeyRound,
  UserX,
  UserCheck,
} from 'lucide-react';
import { usePageTitle } from '../hooks/usePageTitle';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/client';
import { Skeleton } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import UserFormModal from '../components/admin/UserFormModal';
import TempPasswordModal from '../components/admin/TempPasswordModal';
import { formatDateTime } from '../lib/format';

const ROLE_LABEL = {
  admin: 'Administrator',
  analyst: 'Analyst',
  clinician: 'Clinician',
  viewer: 'Viewer',
};

const ROLE_STYLE = {
  admin: 'bg-[var(--status-critical-bg)] text-[var(--status-critical)]',
  analyst: 'bg-[var(--status-info-bg)] text-[var(--status-info)]',
  clinician: 'bg-[var(--status-success-bg)] text-[var(--status-success)]',
  viewer: 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]',
};

export default function AdminUsers() {
  usePageTitle('Users');
  const { user: currentUser } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [tempPassword, setTempPassword] = useState(null);
  const [flash, setFlash] = useState(null);

  const showFlash = (message) => {
    setFlash(message);
    setTimeout(() => setFlash(null), 3000);
  };

  const usersQuery = useQuery({
    queryKey: ['admin-users', search],
    queryFn: () => api.listUsers(search),
    staleTime: 30_000,
    enabled: currentUser?.role === 'admin',
  });

  const optionsQuery = useQuery({
    queryKey: ['options'],
    queryFn: () => api.getOptions(),
    staleTime: 10 * 60 * 1000,
    enabled: currentUser?.role === 'admin',
  });

  const createMutation = useMutation({
    mutationFn: (payload) => api.createUser(payload),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      setShowForm(false);
      setTempPassword({ email: res.user?.email, password: res.temp_password });
    },
    onError: (err) => showFlash(err.message || 'Create failed'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.updateUser(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      setShowForm(false);
      setEditing(null);
      showFlash('User updated');
    },
    onError: (err) => showFlash(err.message || 'Update failed'),
  });

  const resetMutation = useMutation({
    mutationFn: (id) => api.resetUserPassword(id),
    onSuccess: (res, id) => {
      const u = (usersQuery.data ?? []).find((x) => x.id === id);
      setTempPassword({ email: u?.email, password: res.temp_password });
      setConfirmAction(null);
    },
    onError: (err) => {
      showFlash(err.message || 'Reset failed');
      setConfirmAction(null);
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, active }) =>
      active ? api.updateUser(id, { is_active: true }) : api.disableUser(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      setConfirmAction(null);
      showFlash('User updated');
    },
    onError: (err) => {
      showFlash(err.message || 'Action failed');
      setConfirmAction(null);
    },
  });

  if (currentUser?.role !== 'admin') {
    return (
      <div className="py-20">
        <EmptyState
          title="Administrator access required"
          description="You do not have permission to view this page."
        />
      </div>
    );
  }

  const list = usersQuery.data ?? [];
  const counties = optionsQuery.data?.counties ?? [];

  const openCreate = () => {
    setEditing(null);
    setShowForm(true);
  };

  const openEdit = (u) => {
    setEditing(u);
    setShowForm(true);
  };

  const confirmReset = (u) => {
    setConfirmAction({
      title: `Reset password for ${u.name}?`,
      description:
        'A new temporary password will be generated. Their current sessions will be ended.',
      confirmLabel: 'Reset password',
      destructive: true,
      onConfirm: () => resetMutation.mutate(u.id),
    });
  };

  const confirmDisable = (u) => {
    setConfirmAction({
      title: `Disable ${u.name}?`,
      description:
        'The user will be signed out immediately and cannot sign in again until re-enabled.',
      confirmLabel: 'Disable user',
      destructive: true,
      onConfirm: () => toggleActiveMutation.mutate({ id: u.id, active: false }),
    });
  };

  const confirmEnable = (u) => {
    setConfirmAction({
      title: `Re-enable ${u.name}?`,
      description: 'The user will be able to sign in again.',
      confirmLabel: 'Enable user',
      destructive: false,
      onConfirm: () => toggleActiveMutation.mutate({ id: u.id, active: true }),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Users</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Create, edit, and manage access for {list.length}{' '}
            {list.length === 1 ? 'user' : 'users'}.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => usersQuery.refetch()}
            disabled={usersQuery.isFetching}
            className="flex items-center gap-2 px-4 py-2 rounded-full border border-[var(--border-primary)] text-sm hover:bg-[var(--bg-tertiary)]/60 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${usersQuery.isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-1 px-4 py-2 rounded-full text-sm bg-[var(--accent-teal)] text-white"
          >
            <UserPlus className="h-4 w-4" />
            Create user
          </button>
        </div>
      </div>

      <div className="bg-[var(--bg-secondary)]/80 p-4 rounded-2xl">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search by name or email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-lg pl-9 pr-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="bg-[var(--bg-secondary)]/80 rounded-2xl overflow-hidden">
        {usersQuery.isLoading ? (
          <div className="p-5">
            <Skeleton className="h-40" />
          </div>
        ) : list.length === 0 ? (
          <EmptyState
            title={search ? 'No users match your search' : 'No users yet'}
            description={search ? 'Try a different term.' : 'Create the first user to get started.'}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--bg-tertiary)]/40">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-[var(--text-muted)]">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-[var(--text-muted)]">Email</th>
                  <th className="text-left px-4 py-3 font-medium text-[var(--text-muted)]">Role</th>
                  <th className="text-left px-4 py-3 font-medium text-[var(--text-muted)]">County</th>
                  <th className="text-left px-4 py-3 font-medium text-[var(--text-muted)]">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-[var(--text-muted)]">Last login</th>
                  <th className="text-right px-4 py-3 font-medium text-[var(--text-muted)]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((u) => (
                  <tr
                    key={u.id}
                    className="border-t border-[var(--border-primary)]/40 hover:bg-[var(--bg-tertiary)]/20"
                  >
                    <td className="px-4 py-3 text-[var(--text-primary)]">
                      {u.name}
                      {u.id === currentUser.id && (
                        <span className="ml-2 text-xs text-[var(--text-muted)]">(you)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">{u.email}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          ROLE_STYLE[u.role] || ''
                        }`}
                      >
                        {ROLE_LABEL[u.role] || u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">
                      {u.assigned_county || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          u.is_active
                            ? 'bg-[var(--status-success-bg)] text-[var(--status-success)]'
                            : 'bg-[var(--text-muted)]/20 text-[var(--text-muted)]'
                        }`}
                      >
                        {u.is_active ? 'Active' : 'Disabled'}
                      </span>
                      {u.must_change_password && (
                        <span className="ml-1 text-xs text-[var(--status-warning)]" title="Must change password">
                          ·
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[var(--text-muted)] text-xs">
                      {u.last_login_at ? formatDateTime(u.last_login_at) : 'Never'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(u)}
                          className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => confirmReset(u)}
                          className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]"
                          title="Reset password"
                        >
                          <KeyRound className="w-4 h-4" />
                        </button>
                        {u.id !== currentUser.id && (
                          <button
                            type="button"
                            onClick={() => (u.is_active ? confirmDisable(u) : confirmEnable(u))}
                            className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]"
                            title={u.is_active ? 'Disable' : 'Enable'}
                          >
                            {u.is_active ? (
                              <UserX className="w-4 h-4" />
                            ) : (
                              <UserCheck className="w-4 h-4" />
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <UserFormModal
        key={editing?.id ?? (showForm ? 'new' : 'closed')}
        open={showForm}
        editing={editing}
        counties={counties}
        busy={createMutation.isPending || updateMutation.isPending}
        onClose={() => {
          setShowForm(false);
          setEditing(null);
        }}
        onSubmit={(payload) => {
          if (editing) {
            updateMutation.mutate({ id: editing.id, data: payload });
          } else {
            createMutation.mutate(payload);
          }
        }}
      />

      <TempPasswordModal
        open={!!tempPassword}
        email={tempPassword?.email}
        password={tempPassword?.password || ''}
        onClose={() => setTempPassword(null)}
      />

      <ConfirmDialog
        open={!!confirmAction}
        title={confirmAction?.title}
        description={confirmAction?.description}
        confirmLabel={confirmAction?.confirmLabel}
        destructive={confirmAction?.destructive}
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => confirmAction?.onConfirm()}
      />

      {flash && (
        <div className="fixed bottom-6 right-6 z-[1300] bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-full px-4 py-2 text-sm shadow-lg">
          {flash}
        </div>
      )}
    </div>
  );
}
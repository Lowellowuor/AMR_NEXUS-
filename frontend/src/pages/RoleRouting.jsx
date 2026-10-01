import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowPathIcon,
  BellAlertIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import { usePageTitle } from '../hooks/usePageTitle';
import api from '../api/client';
import { Skeleton } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import { useAuth } from '../contexts/AuthContext';

const ROLES = ['admin', 'analyst', 'clinician', 'viewer'];
const CHANNELS = ['email', 'sms', 'desktop'];
const SEVERITIES = ['critical', 'high', 'medium', 'low'];

const CHANNEL_LABEL = { email: 'Email', sms: 'SMS', desktop: 'Desktop' };
const SEVERITY_LABEL = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

function RuleCell({ rule, canEdit, onUpdate }) {
  if (!rule) {
    return (
      <span className="text-xs text-[var(--text-muted)]">not configured</span>
    );
  }

  const handleSeverityChange = (value) => {
    if (!canEdit) return;
    onUpdate(rule.id, { min_severity: value });
  };

  const handleToggle = () => {
    if (!canEdit) return;
    onUpdate(rule.id, { enabled: !rule.enabled });
  };

  return (
    <div className="flex items-center gap-2">
      <select
        value={rule.min_severity}
        onChange={(e) => handleSeverityChange(e.target.value)}
        disabled={!canEdit || !rule.enabled}
        className={`text-xs rounded-lg px-2 py-1 border border-[var(--border-primary)] bg-[var(--bg-primary)] ${
          !rule.enabled ? 'opacity-50' : ''
        }`}
      >
        {SEVERITIES.map((s) => (
          <option key={s} value={s}>
            {SEVERITY_LABEL[s]}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={handleToggle}
        disabled={!canEdit}
        className={`text-xs px-2 py-0.5 rounded-full ${
          rule.enabled
            ? 'bg-[var(--status-success)]/20 text-[var(--status-success)]'
            : 'bg-[var(--text-muted)]/20 text-[var(--text-muted)]'
        } ${!canEdit ? 'cursor-not-allowed' : 'hover:opacity-80'}`}
        title={rule.enabled ? 'Click to disable' : 'Click to enable'}
      >
        {rule.enabled ? 'On' : 'Off'}
      </button>
    </div>
  );
}

export default function RoleRouting() {
  usePageTitle('Alert Routing');
  const { user } = useAuth();
  const qc = useQueryClient();
  const canEdit = user?.role === 'admin';

  const rulesQuery = useQuery({
    queryKey: ['role-routing'],
    queryFn: () => api.getRoleRouting(),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.updateRoleRouting(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['role-routing'] }),
  });

  const resetMutation = useMutation({
    mutationFn: () => api.resetRoleRoutingDefaults(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['role-routing'] }),
  });

  const grid = useMemo(() => {
    const g = {};
    for (const r of ROLES) {
      g[r] = {};
      for (const c of CHANNELS) g[r][c] = null;
    }
    for (const rule of rulesQuery.data ?? []) {
      if (g[rule.role] && rule.channel in g[rule.role]) {
        g[rule.role][rule.channel] = rule;
      }
    }
    return g;
  }, [rulesQuery.data]);

  const handleUpdate = (id, data) => updateMutation.mutate({ id, data });

  const handleReset = () => {
    if (
      window.confirm(
        'Reset all role-routing rules to defaults? This overwrites any custom configuration.',
      )
    ) {
      resetMutation.mutate();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <ShieldCheckIcon className="h-6 w-6 text-[var(--accent-teal)]" />
            Alert Routing
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Which role receives which severity on which channel. Applied
            together with each user's personal preferences.
          </p>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={handleReset}
            disabled={resetMutation.isPending}
            className="flex items-center gap-1 px-4 py-2 rounded-full text-sm border border-[var(--border-primary)] hover:bg-[var(--bg-tertiary)]/60 disabled:opacity-50"
          >
            <ArrowPathIcon className="h-4 w-4" />
            {resetMutation.isPending ? 'Resetting…' : 'Reset to defaults'}
          </button>
        )}
      </div>

      {!canEdit && (
        <div className="bg-[var(--status-warning)]/10 border border-[var(--status-warning)]/30 text-[var(--status-warning)] text-sm rounded-2xl p-4">
          You can view routing rules but only administrators can change them.
        </div>
      )}

      {resetMutation.isSuccess && (
        <div className="bg-[var(--status-success)]/10 border border-[var(--status-success)]/30 text-[var(--status-success)] text-sm rounded-2xl p-4">
          Defaults restored ({resetMutation.data?.restored ?? 0} rules).
        </div>
      )}

      <div className="bg-[var(--bg-secondary)]/80 rounded-2xl overflow-hidden">
        {rulesQuery.isLoading ? (
          <div className="p-5">
            <Skeleton className="h-40" />
          </div>
        ) : rulesQuery.isError ? (
          <div className="p-5">
            <EmptyState
              title="Could not load routing rules"
              description={rulesQuery.error?.message || 'Try refreshing the page.'}
              icon={BellAlertIcon}
            />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg-tertiary)]/40">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-[var(--text-muted)]">
                  Role
                </th>
                {CHANNELS.map((c) => (
                  <th
                    key={c}
                    className="text-left px-4 py-3 font-medium text-[var(--text-muted)]"
                  >
                    {CHANNEL_LABEL[c]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROLES.map((role) => (
                <tr
                  key={role}
                  className="border-t border-[var(--border-primary)]/40"
                >
                  <td className="px-4 py-3 font-medium text-[var(--text-primary)] capitalize">
                    {role}
                  </td>
                  {CHANNELS.map((channel) => (
                    <td key={channel} className="px-4 py-3">
                      <RuleCell
                        rule={grid[role][channel]}
                        canEdit={canEdit}
                        onUpdate={handleUpdate}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="bg-[var(--bg-secondary)]/80 p-5 rounded-2xl">
        <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-2">
          How routing works
        </h2>
        <ul className="text-xs text-[var(--text-secondary)] space-y-1 list-disc list-inside">
          <li>
            <strong>Severity threshold</strong> — the minimum alert severity
            that must occur for this role to be notified on that channel.
          </li>
          <li>
            <strong>On / Off</strong> — turn the whole channel off for a role
            regardless of severity.
          </li>
          <li>
            A notification is sent only when <em>both</em> this role rule{' '}
            <em>and</em> the recipient's personal preferences allow it.
          </li>
          <li>
            If a role/channel is not configured, notifications fail open
            (allowed) to preserve existing behaviour.
          </li>
        </ul>
      </div>
    </div>
  );
}
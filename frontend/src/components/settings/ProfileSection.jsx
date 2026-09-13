import { User as UserIcon, Mail, Shield, MapPin, Calendar } from 'lucide-react';
import { formatDateTime } from '../../lib/format';

export default function ProfileSection({ user }) {
  if (!user) return null;
  return (
    <div className="space-y-5">
      <div className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-5">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-full bg-[var(--accent-teal)]/10 flex items-center justify-center flex-shrink-0">
            <UserIcon className="w-8 h-8 text-[var(--accent-teal)]" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-[var(--text-primary)]">{user.name}</h2>
            <p className="text-sm text-[var(--text-muted)]">{user.email}</p>
          </div>
        </div>
      </div>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-4">
          <dt className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">
            <Mail className="w-3 h-3" /> Email
          </dt>
          <dd className="text-sm text-[var(--text-primary)]">{user.email}</dd>
        </div>
        <div className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-4">
          <dt className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">
            <Shield className="w-3 h-3" /> Role
          </dt>
          <dd className="text-sm text-[var(--text-primary)] capitalize">{user.role}</dd>
        </div>
        <div className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-4">
          <dt className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">
            <MapPin className="w-3 h-3" /> Assigned county
          </dt>
          <dd className="text-sm text-[var(--text-primary)]">
            {user.assigned_county || <span className="text-[var(--text-muted)] italic">National scope</span>}
          </dd>
        </div>
        <div className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-4">
          <dt className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1">
            <Calendar className="w-3 h-3" /> Member since
          </dt>
          <dd className="text-sm text-[var(--text-primary)]">
            {user.created_at ? formatDateTime(user.created_at) : '-'}
          </dd>
        </div>
      </dl>
      <div className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-tertiary)]/50 p-4">
        <p className="text-xs text-[var(--text-muted)] leading-relaxed">
          To change your name, email, role, or assigned county, contact your platform administrator.
          These fields are audited for compliance.
        </p>
      </div>
    </div>
  );
}

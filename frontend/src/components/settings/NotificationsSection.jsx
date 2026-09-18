import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { Bell, Mail, MessageSquare, Smartphone, AlertCircle, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import {
  getNotificationPrefs, updateNotificationPrefs, getNotificationStatus,
} from '../../api/endpoints';

function Toggle({ checked, onChange, disabled }) {
  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      disabled={disabled}
      className="mt-1 rounded border-[var(--border-secondary)]"
    />
  );
}

export default function NotificationsSection() {
  const qc = useQueryClient();
  const [local, setLocal] = useState(null);

  const { data: prefs, isLoading } = useQuery({
    queryKey: ['notif-prefs'],
    queryFn: getNotificationPrefs,
    staleTime: 30_000,
  });

  const { data: status } = useQuery({
    queryKey: ['notif-status'],
    queryFn: getNotificationStatus,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (prefs && !local) setLocal(prefs);
  }, [prefs, local]);

  const saveMutation = useMutation({
    mutationFn: (patch) => updateNotificationPrefs(patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notif-prefs'] });
    },
    onError: () => toast.error('Could not save preferences'),
  });

  const save = (patch) => {
    setLocal((prev) => ({ ...prev, ...patch }));
    saveMutation.mutate(patch);
  };

  const desktopAvailable = typeof window !== 'undefined' && 'Notification' in window;
  const desktopPermission = desktopAvailable ? Notification.permission : 'unsupported';

  const requestDesktop = async () => {
    if (!desktopAvailable) return;
    const result = await Notification.requestPermission();
    if (result === 'granted') save({ desktop_enabled: true });
  };

  if (isLoading || !local) {
    return (
      <div className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-5">
        <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading preferences...
        </div>
      </div>
    );
  }

  const emailAvailable = status?.email_configured;
  const smsAvailable = status?.sms_configured;

  return (
    <div className="space-y-5">
      {!emailAvailable && !smsAvailable && (
        <div className="flex items-start gap-3 rounded-[var(--radius-card)] border border-[var(--status-warning-border)] bg-[var(--status-warning-bg)] p-4">
          <AlertCircle className="w-4 h-4 text-[var(--status-warning)] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-[var(--status-warning)]">
              External delivery not yet configured
            </p>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Your preferences are saved and will be honoured once the platform
              administrator configures SMTP (email) and Africa's Talking (SMS) credentials.
            </p>
          </div>
        </div>
      )}

      <div className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-5">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
          <Bell className="w-4 h-4 text-[var(--accent-teal)]" />
          Alert delivery
        </h3>

        <div className="space-y-3">
          <div className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-tertiary)]/40 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">In-app notifications</p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Always on. Alerts appear in the notification bell and on the Alerts page.
                </p>
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--status-success-bg)] text-[var(--status-success)] border border-[var(--status-success-border)]">
                Enabled
              </span>
            </div>
          </div>

          <div className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-4">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 text-[var(--text-muted)] mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">Email alerts</p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    Delivered to your registered email
                    {emailAvailable ? '' : ' (server not configured)'}
                  </p>
                </div>
              </div>
              <Toggle
                checked={local.email_enabled}
                onChange={(v) => save({ email_enabled: v })}
              />
            </div>
            {local.email_enabled && (
              <label className="flex items-center justify-between gap-3 pl-7">
                <span className="text-xs text-[var(--text-muted)]">Minimum severity</span>
                <select
                  value={local.email_severity}
                  onChange={(e) => save({ email_severity: e.target.value })}
                  className="rounded-[var(--radius-input)] border border-[var(--border-primary)] bg-[var(--bg-primary)] px-3 py-1.5 text-xs text-[var(--text-primary)]"
                >
                  <option value="critical">Critical only</option>
                  <option value="high">High and above</option>
                  <option value="medium">Medium and above</option>
                  <option value="low">All severities</option>
                </select>
              </label>
            )}
          </div>

          <div className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-4">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex items-start gap-3">
                <Smartphone className="w-4 h-4 text-[var(--text-muted)] mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">SMS alerts</p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    For field staff away from screens
                    {smsAvailable ? '' : ' (server not configured)'}
                  </p>
                </div>
              </div>
              <Toggle
                checked={local.sms_enabled}
                onChange={(v) => save({ sms_enabled: v })}
              />
            </div>
            {local.sms_enabled && (
              <div className="space-y-2 pl-7">
                <input
                  type="tel"
                  value={local.sms_phone}
                  onChange={(e) => setLocal({ ...local, sms_phone: e.target.value })}
                  onBlur={(e) => save({ sms_phone: e.target.value })}
                  placeholder="+254 7XX XXX XXX"
                  className="w-full rounded-[var(--radius-input)] border border-[var(--border-primary)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)]"
                />
                <label className="flex items-center justify-between gap-3">
                  <span className="text-xs text-[var(--text-muted)]">Minimum severity</span>
                  <select
                    value={local.sms_severity}
                    onChange={(e) => save({ sms_severity: e.target.value })}
                    className="rounded-[var(--radius-input)] border border-[var(--border-primary)] bg-[var(--bg-primary)] px-3 py-1.5 text-xs text-[var(--text-primary)]"
                  >
                    <option value="critical">Critical only</option>
                    <option value="high">High and above</option>
                    <option value="medium">Medium and above</option>
                    <option value="low">All severities</option>
                  </select>
                </label>
              </div>
            )}
          </div>

          <div className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <Bell className="w-4 h-4 text-[var(--text-muted)] mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">Desktop notifications</p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    {desktopPermission === 'denied'
                      ? 'Blocked by your browser. Enable in browser settings.'
                      : desktopPermission === 'granted'
                        ? 'Shown when this tab is not focused'
                        : 'Click to grant browser permission'}
                  </p>
                </div>
              </div>
              <Toggle
                checked={local.desktop_enabled && desktopPermission === 'granted'}
                onChange={(v) => (v ? requestDesktop() : save({ desktop_enabled: false }))}
                disabled={!desktopAvailable}
              />
            </div>
          </div>
        </div>

        <p className="text-xs text-[var(--text-muted)] mt-4 leading-relaxed flex items-start gap-2">
          <MessageSquare className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          Preferences are stored server-side and applied to every new alert.
          Critical alerts always require acknowledgement.
        </p>
      </div>
    </div>
  );
}

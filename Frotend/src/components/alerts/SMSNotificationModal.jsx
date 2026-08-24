import { useState, useEffect } from 'react';
import { X, Send, CheckCircle2, Loader2 } from 'lucide-react';
import api from '../../api/client';

export default function SMSNotificationModal() {
  const [open, setOpen] = useState(false);
  const [alert, setAlert] = useState(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const handler = (event) => {
      setAlert(event.detail);
      setOpen(true);
      setSent(false);
      setError(null);
    };
    window.addEventListener('sms-notification', handler);
    return () => window.removeEventListener('sms-notification', handler);
  }, []);

  const handleSend = async () => {
    if (!alert) return;
    setSending(true);
    setError(null);
    try {
      await api.sendSMS(alert.phone, alert.message);
      setSent(true);
    } catch (err) {
      setError(err.message || 'Failed to send SMS');
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div className="relative card max-w-md w-full p-6">
        <button
          onClick={() => setOpen(false)}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center">
            <Send className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-[var(--text-primary)]">Send SMS Alert</h3>
            <p className="text-xs text-[var(--text-muted)]">Africa’s Talking</p>
          </div>
        </div>

        {alert && (
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-zinc-800 mb-4">
            <p className="text-xs font-semibold text-[var(--text-primary)]">
              To: {alert.recipient || alert.county} AMR Focal Person
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              {alert.phone || '+254 7XX XXX XXX'}
            </p>
            <p className="text-sm text-[var(--text-secondary)] mt-2">{alert.message || alert.summary}</p>
          </div>
        )}

        {error && (
          <div className="p-2 mb-3 rounded-lg bg-red-50 dark:bg-red-950/30 text-red-500 text-xs">
            {error}
          </div>
        )}

        {sent ? (
          <div className="flex items-center gap-2 text-emerald-500">
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-sm font-medium">SMS sent successfully</span>
          </div>
        ) : (
          <button
            onClick={handleSend}
            disabled={sending}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {sending ? 'Sending...' : 'Send SMS'}
          </button>
        )}
      </div>
    </div>
  );
}
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { Download, FileText, Trash2, Shield, ExternalLink } from 'lucide-react';
import ConfirmDialog from '../ui/ConfirmDialog';
import api from '../../api/client';

export default function PrivacySection() {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [reason, setReason] = useState('');

  const exportMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem('amr-nexus-token');
      const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const res = await fetch(`${base}/user/export`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `amr_nexus_my_data_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
    },
    onSuccess: () => toast.success('Your data has been downloaded'),
    onError: () => toast.error('Failed to export your data'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.requestDeletion(reason),
    onSuccess: () => {
      toast.success('Deletion request logged. An administrator will review it.');
      setShowDeleteDialog(false);
      setReason('');
    },
    onError: () => toast.error('Failed to submit request'),
  });

  return (
    <div className="space-y-5">
      <div className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-5">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2 flex items-center gap-2">
          <Shield className="w-4 h-4 text-[var(--accent-teal)]" />
          Your data rights (Kenya Data Protection Act 2019)
        </h3>
        <p className="text-xs text-[var(--text-muted)] mb-5 leading-relaxed">
          Under the Data Protection Act 2019, you have the right to access the data the platform
          holds about you, and to request its deletion.
        </p>
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-4 p-4 rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-tertiary)]/40">
            <div className="min-w-0">
              <p className="text-sm font-medium text-[var(--text-primary)]">Download my data</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                CSV containing every record you can access and your audit history
              </p>
            </div>
            <button
              onClick={() => exportMutation.mutate()}
              disabled={exportMutation.isPending}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-[var(--radius-btn)] bg-[var(--accent-teal)] text-white text-sm font-medium hover:bg-[var(--accent-teal-hover)] transition disabled:opacity-60 flex-shrink-0"
            >
              <Download className="w-4 h-4" />
              {exportMutation.isPending ? 'Preparing...' : 'Download'}
            </button>
          </div>
          <div className="flex items-start justify-between gap-4 p-4 rounded-[var(--radius-card)] border border-[var(--status-critical-border)] bg-[var(--status-critical-bg)]">
            <div className="min-w-0">
              <p className="text-sm font-medium text-[var(--status-critical)]">Request account deletion</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Logs a data protection request. An administrator reviews before any data is removed.
              </p>
            </div>
            <button
              onClick={() => setShowDeleteDialog(true)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-[var(--radius-btn)] bg-[var(--status-critical)] text-white text-sm font-medium hover:opacity-90 transition flex-shrink-0"
            >
              <Trash2 className="w-4 h-4" />
              Request
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-5">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4 text-[var(--accent-teal)]" />
          Privacy notice
        </h3>
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-3">
          We collect isolate-level data for AMR surveillance, early warning, and reporting to the
          Ministry of Health. Data is stored in Kenya. Access is logged. Patient identifiers are
          never collected.
        </p>
        <a href="/privacy" className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--accent-teal)] hover:underline">
          <ExternalLink className="w-3 h-3" />
          Full privacy notice
        </a>
      </div>

      <ConfirmDialog
        open={showDeleteDialog}
        title="Request account deletion?"
        description="This creates a formal Data Protection Act request. An administrator will review it."
        confirmLabel="Submit request"
        cancelLabel="Cancel"
        destructive
        onConfirm={() => deleteMutation.mutate()}
        onCancel={() => setShowDeleteDialog(false)}
      />
    </div>
  );
}

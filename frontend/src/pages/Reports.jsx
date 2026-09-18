import { useCallback, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { FileText, Download, Printer, RefreshCw } from 'lucide-react';

import { generateReport, getReportTypes, getOptions } from '../api/endpoints';
import { usePageTitle } from '../hooks/usePageTitle';
import ReportPreview from '../components/reports/ReportPreview';

const DATE_PRESETS = [
  { id: '7d', label: 'Last 7 days', days: 7 },
  { id: '30d', label: 'Last 30 days', days: 30 },
  { id: '90d', label: 'Last 90 days', days: 90 },
];

function rangeFor(preset, customStart, customEnd) {
  if (preset === 'custom') {
    return { start: customStart, end: customEnd };
  }
  const found = DATE_PRESETS.find((p) => p.id === preset);
  const days = found?.days ?? 30;
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

export default function Reports() {
  usePageTitle('Reports');
  const [reportType, setReportType] = useState('monthly_county');
  const [scope, setScope] = useState('county');
  const [county, setCounty] = useState('');
  const [datePreset, setDatePreset] = useState('30d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [exportingPdf, setExportingPdf] = useState(false);

  const { data: reportTypes } = useQuery({
    queryKey: ['report-types'],
    queryFn: getReportTypes,
    staleTime: 30 * 60 * 1000,
  });

  const { data: options } = useQuery({
    queryKey: ['report-options'],
    queryFn: getOptions,
    staleTime: 10 * 60 * 1000,
  });

  // When report type changes, adopt its default scope
  useEffect(() => {
    if (!reportTypes) return;
    const found = reportTypes.find((r) => r.id === reportType);
    if (found) setScope(found.default_scope);
  }, [reportType, reportTypes]);

  const handleGenerate = useCallback(async () => {
    if (scope === 'county' && !county) {
      toast.error('Select a county');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { start, end } = rangeFor(datePreset, customStart, customEnd);
      const params = new URLSearchParams({
        type: reportType,
        scope,
        start_date: start,
        end_date: end,
      });
      if (scope === 'county' && county) params.set('county', county);

      const data = await generateReport(params.toString());
      setReport(data);
    } catch (err) {
      setError(err.message || 'Failed to generate report');
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [reportType, scope, county, datePreset, customStart, customEnd]);

  const exportPDF = async () => {
    if (!report) return;
    setExportingPdf(true);
    try {
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'),
        import('html2canvas'),
      ]);

      // Force light mode for capture
      const html = document.documentElement;
      const wasDark = html.classList.contains('dark');
      if (wasDark) html.classList.remove('dark');

      await new Promise((r) => setTimeout(r, 120));

      const element = document.getElementById('report-capture');
      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
      });

      if (wasDark) html.classList.add('dark');

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 10;
      const usableWidth = pageWidth - margin * 2;
      const imgHeight = (canvas.height * usableWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = margin;

      pdf.addImage(imgData, 'PNG', margin, position, usableWidth, imgHeight);
      heightLeft -= pageHeight - margin * 2;

      while (heightLeft > 0) {
        position = margin - (imgHeight - heightLeft);
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', margin, position, usableWidth, imgHeight);
        heightLeft -= pageHeight - margin * 2;
      }

      pdf.save(`${report.meta.report_id}.pdf`);
      toast.success('PDF downloaded');
    } catch (err) {
      console.error(err);
      toast.error('PDF export failed');
    } finally {
      setExportingPdf(false);
    }
  };

  const printReport = () => {
    window.print();
  };

  const counties = options?.counties || [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap justify-between items-center gap-3 no-print">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Reports</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            Generate Ministry of Health compliant AMR reports
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-btn)] bg-[var(--accent-teal)] hover:bg-[var(--accent-teal-hover)] text-white text-sm font-medium transition disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Generating...' : 'Generate report'}
          </button>
          {report && (
            <>
              <button
                onClick={printReport}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-btn)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] text-sm font-medium hover:bg-[var(--bg-tertiary)] transition"
              >
                <Printer className="w-4 h-4" />
                Print
              </button>
              <button
                onClick={exportPDF}
                disabled={exportingPdf}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-btn)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] text-sm font-medium hover:bg-[var(--bg-tertiary)] transition disabled:opacity-60"
              >
                <Download className="w-4 h-4" />
                {exportingPdf ? 'Exporting...' : 'Download PDF'}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-4 space-y-3 no-print">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Report type
            </span>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="rounded-[var(--radius-input)] border border-[var(--border-primary)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)]"
            >
              {(reportTypes || []).map((r) => (
                <option key={r.id} value={r.id}>{r.title}</option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Scope
            </span>
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              className="rounded-[var(--radius-input)] border border-[var(--border-primary)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)]"
            >
              <option value="national">National</option>
              <option value="county">County</option>
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              County
            </span>
            <select
              value={county}
              onChange={(e) => setCounty(e.target.value)}
              disabled={scope !== 'county'}
              className="rounded-[var(--radius-input)] border border-[var(--border-primary)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)] disabled:opacity-50"
            >
              <option value="">Select county</option>
              {counties.map((c) => (
                <option key={c.code} value={c.code}>{c.name}</option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Period
            </span>
            <select
              value={datePreset}
              onChange={(e) => setDatePreset(e.target.value)}
              className="rounded-[var(--radius-input)] border border-[var(--border-primary)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)]"
            >
              {DATE_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
              <option value="custom">Custom</option>
            </select>
          </label>
        </div>

        {datePreset === 'custom' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[var(--border-primary)]">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">From</span>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="rounded-[var(--radius-input)] border border-[var(--border-primary)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)]"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">To</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="rounded-[var(--radius-input)] border border-[var(--border-primary)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)]"
              />
            </label>
          </div>
        )}
      </div>

      <div id="report-capture">
        <ReportPreview report={report} loading={loading} error={error} />
      </div>

      {!report && !loading && (
        <div className="rounded-[var(--radius-card)] border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-8 text-center no-print">
          <FileText className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-3" />
          <p className="text-sm text-[var(--text-secondary)]">
            Choose a report type and click <strong>Generate report</strong>.
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Reports are formatted to Ministry of Health standards and can be printed or saved as PDF.
          </p>
        </div>
      )}
    </div>
  );
}

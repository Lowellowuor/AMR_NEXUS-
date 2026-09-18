import { useState } from 'react';
import * as XLSX from 'xlsx';
import { useQueryClient } from '@tanstack/react-query';
import api from '../api/client';
import { toast } from 'react-hot-toast';
import { Upload, Loader2, XCircle } from 'lucide-react';
import { usePageTitle } from '../hooks/usePageTitle';

const BATCH_SIZE = 25;
const PREVIEW_ROWS = 10;

export default function BulkImport() {
  usePageTitle('Bulk Import');
  const qc = useQueryClient();
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState([]);
  const [preview, setPreview] = useState([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, ok: 0, failed: 0 });
  const [errors, setErrors] = useState([]);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const parsed = XLSX.utils.sheet_to_json(sheet);
        setFileName(file.name);
        setRows(parsed);
        setPreview(parsed.slice(0, PREVIEW_ROWS));
        setProgress({ done: 0, total: parsed.length, ok: 0, failed: 0 });
        setErrors([]);
      } catch (err) {
        toast.error('Could not parse file: ' + (err?.message || 'unknown error'));
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImport = async () => {
    if (rows.length === 0) return;
    setImporting(true);
    setErrors([]);

    let ok = 0;
    let failed = 0;
    const failures = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        await api.submitPrediction(row);
        ok++;
      } catch (err) {
        failed++;
        failures.push({
          index: i + 1,
          error: err?.message || String(err),
          row,
        });
      }
      setProgress({ done: i + 1, total: rows.length, ok, failed });

      if ((i + 1) % BATCH_SIZE === 0) {
        await new Promise((r) => setTimeout(r, 0));
      }
    }

    setImporting(false);
    setErrors(failures);

    qc.invalidateQueries();

    if (failed === 0) {
      toast.success('Imported ' + ok + ' of ' + rows.length + ' records');
      setRows([]);
      setPreview([]);
      setFileName('');
      setProgress({ done: 0, total: 0, ok: 0, failed: 0 });
    } else {
      toast.error(
        'Imported ' + ok + ' of ' + rows.length + ' \u2014 ' + failed + ' failed (see details below)'
      );
    }
  };

  const handleReset = () => {
    setRows([]);
    setPreview([]);
    setFileName('');
    setErrors([]);
    setProgress({ done: 0, total: 0, ok: 0, failed: 0 });
  };

  const pct = progress.total > 0
    ? Math.round((progress.done / progress.total) * 100)
    : 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Bulk Import Predictions</h1>

      <div className="bg-[var(--bg-secondary)]/80 backdrop-blur-sm rounded-2xl p-6 space-y-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <Upload className="w-4 h-4" />
          <span className="text-sm font-medium">
            {fileName
              ? 'Loaded: ' + fileName + ' (' + rows.length + ' rows)'
              : 'Choose .xlsx, .xls, or .csv'}
          </span>
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFile}
            disabled={importing}
            className="hidden"
          />
        </label>

        {rows.length > 0 && (
          <>
            <div className="text-xs text-[var(--text-muted)]">
              Preview: first {preview.length} of {rows.length} rows
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr>
                    {Object.keys(preview[0] || {}).map((k) => (
                      <th key={k} className="border p-1 text-left">{k}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, i) => (
                    <tr key={i}>
                      {Object.values(row).map((v, j) => (
                        <td key={j} className="border p-1">
                          {String(v).slice(0, 20)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {importing && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span>Importing {progress.done} of {progress.total}</span>
                  <span>{pct}%</span>
                </div>
                <div className="h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[var(--accent-teal)] transition-all"
                    style={{ width: pct + '%' }}
                  />
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleImport}
                disabled={importing}
                className="px-4 py-2 bg-[var(--accent-teal)] text-white rounded-full flex items-center gap-2 disabled:opacity-50"
              >
                {importing && <Loader2 className="w-4 h-4 animate-spin" />}
                {importing ? 'Importing...' : 'Import ' + rows.length + ' records'}
              </button>
              <button
                onClick={handleReset}
                disabled={importing}
                className="px-4 py-2 border border-[var(--border-primary)] rounded-full text-sm disabled:opacity-50"
              >
                Clear
              </button>
            </div>
          </>
        )}

        {errors.length > 0 && (
          <div className="border border-[var(--status-critical-border)] rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2 text-[var(--status-critical)] font-medium text-sm">
              <XCircle className="w-4 h-4" />
              {errors.length} rows failed
            </div>
            <div className="max-h-64 overflow-y-auto space-y-1">
              {errors.map((e, i) => (
                <div key={i} className="text-xs text-[var(--text-secondary)] border-b border-[var(--border-primary)] pb-1">
                  <span className="font-mono">Row {e.index}:</span> {e.error}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

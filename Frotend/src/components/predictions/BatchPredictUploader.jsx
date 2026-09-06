import { useState } from 'react';
import * as XLSX from 'xlsx';
import { useQueryClient } from '@tanstack/react-query';
import {
  CloudArrowUpIcon,
  DocumentArrowUpIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import api from '../../api/client';
import { useOfflineDrafts } from '../../hooks/useOfflineDrafts';

const BOOLEAN_FIELDS = [
  'mdr_flag',
  'prior_antibiotic_exposure',
  'anomaly_flag',
  'gene_marker_blandm',
  'gene_marker_mcr1',
];

const NUMBER_FIELDS = [
  'sample_month',
  'patient_age_years',
  'anomaly_score',
  'shap_value',
  'mdr_probability',
];

const DATE_FIELDS = [
  'created_at',
  'updated_at',
  'sample_collection_date',
];

function excelSerialToDate(serial) {
  if (typeof serial === 'string') {
    serial = Number(serial);
  }
  if (typeof serial !== 'number' || isNaN(serial)) {
    return null;
  }
  const excelEpoch = new Date(1899, 11, 30);
  const date = new Date(excelEpoch.getTime() + serial * 86400000);
  return date.toISOString().slice(0, 10);
}

function convertValue(value, fieldName) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  if (BOOLEAN_FIELDS.includes(fieldName)) {
    if (typeof value === 'boolean') return value;
    return value === true || value === 'true' || value === 1 || value === '1';
  }

  if (NUMBER_FIELDS.includes(fieldName)) {
    const num = Number(value);
    return isNaN(num) ? null : num;
  }

  if (DATE_FIELDS.includes(fieldName)) {
    return excelSerialToDate(value);
  }

  return String(value);
}

function findColumnKey(row, target) {
  const targetLower = target.toLowerCase().replace(/\s+/g, '_');
  const keys = Object.keys(row);
  const exact = keys.find(k => k.toLowerCase().replace(/\s+/g, '_') === targetLower);
  if (exact) return exact;

  const partial = keys.find(k => k.toLowerCase().includes(targetLower.split('_')[0]));
  return partial || null;
}

export default function BatchPredictUploader({ onBatchComplete }) {
  const [file, setFile] = useState(null);
  const [rows, setRows] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState([]);
  const [progress, setProgress] = useState({ processed: 0, total: 0 });
  const { addDraft } = useOfflineDrafts();
  const queryClient = useQueryClient();

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFile(file);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet);
      setRows(json);
      setResults([]);
      setProgress({ processed: 0, total: 0 });
    };
    reader.readAsArrayBuffer(file);
  };

  const clearFile = () => {
    setFile(null);
    setRows([]);
    setResults([]);
    setProgress({ processed: 0, total: 0 });
  };

  const handleBatchSubmit = async () => {
    if (rows.length === 0) return;
    setProcessing(true);
    const total = rows.length;
    setProgress({ processed: 0, total });
    const outcomes = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const payload = {};
        Object.keys(row).forEach((col) => {
          const fieldName = col.trim().toLowerCase().replace(/\s+/g, '_');
          payload[fieldName] = convertValue(row[col], fieldName);
        });

        if (!payload.county) {
          const countyCol = findColumnKey(row, 'county');
          if (countyCol) payload.county = row[countyCol];
        }
        if (!payload.sub_county) {
          const subCol = findColumnKey(row, 'sub_county') || findColumnKey(row, 'sub county');
          if (subCol) payload.sub_county = row[subCol];
        }

        if (!payload.record_id) {
          payload.record_id = crypto.randomUUID ? crypto.randomUUID() : `uuid-${Date.now()}-${i}`;
        }
        if (!payload.created_at) {
          payload.created_at = new Date().toISOString();
        }
        if (!payload.updated_at) {
          payload.updated_at = new Date().toISOString();
        }
        if (!payload.sample_collection_date) {
          payload.sample_collection_date = new Date().toISOString().slice(0, 10);
        }
        if (!payload.sample_month) {
          payload.sample_month = new Date(payload.sample_collection_date).getMonth() + 1;
        }

        const result = await api.submitPrediction(payload);
        outcomes.push({ row, result, success: true });
        queryClient.invalidateQueries({ queryKey: ['hotspots'] });
      } catch (err) {
        outcomes.push({ row, error: err.message, success: false });
        if (!navigator.onLine) {
          await addDraft({ formData: row, timestamp: new Date() });
        }
      }
      setProgress({ processed: i + 1, total });
    }

    setResults(outcomes);
    setProcessing(false);
    if (onBatchComplete) onBatchComplete(outcomes);
  };

  const successCount = results.filter(r => r.success).length;
  const failCount = results.length - successCount;
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-md border border-white/50 p-6">
      <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-4">
        <DocumentArrowUpIcon className="h-5 w-5 text-primary-600" />
        Batch Upload & Predict
      </h3>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-full transition font-medium">
            <CloudArrowUpIcon className="h-5 w-5" />
            Choose File
            <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} className="hidden" />
          </label>
          {file && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="font-medium">{file.name}</span>
              <button onClick={clearFile} className="text-gray-400 hover:text-red-500 transition">
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {rows.length > 0 && (
          <div className="overflow-x-auto max-h-48 overflow-y-auto">
            <p className="text-sm text-gray-500 mb-2 sticky top-0 bg-white/80 backdrop-blur-sm py-1">
              Preview ({rows.length} rows)
              <span className="ml-2 text-xs text-gray-400">(first 5 shown)</span>
            </p>
            <table className="min-w-full text-xs border-collapse">
              <thead className="bg-gray-50 sticky top-6">
                <tr>
                  {headers.map((key, idx) => (
                    <th key={idx} className="border px-2 py-1 text-left font-medium text-gray-600">
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 5).map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    {headers.map((key, i) => (
                      <td key={i} className="border px-2 py-1 text-gray-700 truncate max-w-[100px]">
                        {String(row[key] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
                {rows.length > 5 && (
                  <tr>
                    <td colSpan={headers.length} className="text-center text-gray-400 py-1">
                      ... and {rows.length - 5} more
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {progress.total > 0 && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Progress</span>
              <span>{progress.processed} / {progress.total}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-primary-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${(progress.processed / progress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {results.length > 0 && (
          <div className="mt-3 p-3 bg-gray-50 rounded-xl max-h-48 overflow-y-auto">
            <div className="flex items-center gap-4 text-sm mb-2">
              <span className="text-green-600 flex items-center gap-1">
                <CheckCircleIcon className="h-4 w-4" /> {successCount} succeeded
              </span>
              {failCount > 0 && (
                <span className="text-red-600 flex items-center gap-1">
                  <ExclamationCircleIcon className="h-4 w-4" /> {failCount} failed
                </span>
              )}
            </div>
            <div className="space-y-1">
              {results.map((r, idx) => (
                <div
                  key={idx}
                  className={`text-sm flex items-center gap-2 ${r.success ? 'text-green-600' : 'text-red-600'}`}
                >
                  {r.success ? <CheckCircleIcon className="h-4 w-4" /> : <XMarkIcon className="h-4 w-4" />}
                  Row {idx + 1}: {r.success ? 'Submitted' : r.error}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="pt-2 border-t border-gray-200 flex flex-wrap items-center gap-3">
          <button
            onClick={handleBatchSubmit}
            disabled={rows.length === 0 || processing}
            className="px-6 py-2.5 bg-gray-800 hover:bg-gray-900 text-white rounded-full text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            {processing
              ? `Submitting... ${progress.processed}/${progress.total}`
              : `Submit ${rows.length} prediction${rows.length > 1 ? 's' : ''}`}
          </button>
          {results.length > 0 && (
            <button
              onClick={clearFile}
              className="text-sm text-gray-600 hover:text-gray-800 transition"
            >
              Clear all
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
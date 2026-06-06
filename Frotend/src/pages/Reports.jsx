// src/pages/Reports.jsx
import { useState, useEffect } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { DocumentArrowDownIcon, DocumentArrowUpIcon } from '@heroicons/react/24/outline';
import api from '../api/client';

export default function Reports() {
  const [dateRange, setDateRange] = useState('last30');
  const [reportType, setReportType] = useState('mdr_summary');
  const [generating, setGenerating] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(true);

  // Fetch preview data based on report type and date range
  const fetchPreviewData = async () => {
    setLoadingPreview(true);
    try {
      let data = {};
      switch (reportType) {
        case 'mdr_summary':
          const summary = await api.getSummary();
          data = {
            total_records: summary.total_records,
            mdr_rate: summary.mdr_rate,
            anomaly_count: summary.anomaly_count,
            active_counties: summary.active_counties,
          };
          break;
        case 'anomaly_report':
          const predictions = await api.getPredictions(500, 0);
          const anomalies = predictions.filter(p => p.anomaly_detected);
          data = {
            total_predictions: predictions.length,
            anomaly_count: anomalies.length,
            anomaly_rate: anomalies.length / predictions.length * 100 || 0,
            recent_anomalies: anomalies.slice(0, 5),
          };
          break;
        case 'sector_comparison':
          const sectors = await api.getBySector();
          data = { sectors };
          break;
        case 'county_ranking':
          const counties = await api.getTopCounties(10);
          data = { counties };
          break;
        default:
          const defaultSummary = await api.getSummary();
          data = defaultSummary;
      }
      setPreviewData(data);
    } catch (err) {
      console.error('Preview fetch error:', err);
      setPreviewData({ error: 'Could not load preview data. Is the backend running?' });
    } finally {
      setLoadingPreview(false);
    }
  };

  useEffect(() => {
    fetchPreviewData();
  }, [reportType, dateRange]); // dateRange could be used for filtering if backend supports it

  const handleGenerate = async () => {
    setGenerating(true);
    // Currently just refreshes the preview (you could later implement a PDF export or detailed download)
    await fetchPreviewData();
    setGenerating(false);
    alert('Preview refreshed with latest data. For full report, consider exporting CSV or using analytics page.');
  };

  const handleExportCSV = async () => {
    try {
      const response = await fetch('http://localhost:8000/export/predictions');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `predictions_${new Date().toISOString().slice(0,19)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Export failed. Is the backend running?');
    }
  };

  // Helper to render preview based on reportType
  const renderPreview = () => {
    if (loadingPreview) {
      return <div className="text-center py-8 text-gray-500">Loading preview...</div>;
    }
    if (previewData?.error) {
      return <div className="text-center py-8 text-red-500">{previewData.error}</div>;
    }

    switch (reportType) {
      case 'mdr_summary':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Total Records</p>
                <p className="text-2xl font-bold text-gray-900">{previewData?.total_records || 0}</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">MDR Rate</p>
                <p className="text-2xl font-bold text-red-600">{previewData?.mdr_rate || 0}%</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Anomalies</p>
                <p className="text-2xl font-bold text-yellow-600">{previewData?.anomaly_count || 0}</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Active Counties</p>
                <p className="text-2xl font-bold text-primary-600">{previewData?.active_counties || 0}</p>
              </div>
            </div>
          </div>
        );
      case 'anomaly_report':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Total Predictions</p>
                <p className="text-2xl font-bold text-gray-900">{previewData?.total_predictions || 0}</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Anomaly Rate</p>
                <p className="text-2xl font-bold text-yellow-600">{previewData?.anomaly_rate?.toFixed(1) || 0}%</p>
              </div>
            </div>
            {previewData?.recent_anomalies?.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Recent Anomalies:</p>
                <ul className="space-y-2">
                  {previewData.recent_anomalies.map((a, idx) => (
                    <li key={idx} className="text-sm text-gray-600 border-l-4 border-yellow-500 pl-3">
                      {a.pathogen_code?.toUpperCase()} in {a.county} – {new Date(a.timestamp).toLocaleDateString()}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      case 'sector_comparison':
        return (
          <div className="space-y-3">
            {previewData?.sectors?.length > 0 ? (
              previewData.sectors.map((s, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium text-gray-700">{s.name}</span>
                  <span className="text-lg font-bold text-primary-600">{s.value}% MDR</span>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center">No sector data available.</p>
            )}
          </div>
        );
      case 'county_ranking':
        return (
          <div className="space-y-3">
            {previewData?.counties?.length > 0 ? (
              previewData.counties.map((c, idx) => (
                <div key={c.county} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-gray-400 w-6">{idx + 1}</span>
                    <span className="font-medium text-gray-700">{c.county}</span>
                  </div>
                  <span className="text-lg font-bold text-primary-600">{c.rate}% MDR</span>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center">No county ranking data available.</p>
            )}
          </div>
        );
      default:
        return <p className="text-gray-500 text-center">Select a report type to see preview.</p>;
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Reports & Export</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Report configuration */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-md border border-white/50 overflow-hidden">
            <div className="p-5 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800">Report Settings</h2>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="w-full rounded-full border border-gray-200 bg-gray-50/50 px-4 py-2 text-sm focus:ring-2 focus:ring-primary-500/20"
                >
                  <option value="mdr_summary">MDR Summary</option>
                  <option value="anomaly_report">Anomaly Report</option>
                  <option value="sector_comparison">Sector Comparison</option>
                  <option value="county_ranking">County Ranking</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="w-full rounded-full border border-gray-200 bg-gray-50/50 px-4 py-2 text-sm focus:ring-2 focus:ring-primary-500/20"
                >
                  <option value="last7">Last 7 days</option>
                  <option value="last30">Last 30 days</option>
                  <option value="last90">Last 90 days</option>
                  <option value="custom">Custom range (coming soon)</option>
                </select>
              </div>
              <Button onClick={handleGenerate} loading={generating} className="w-full">
                {generating ? 'Refreshing...' : 'Generate Report'}
              </Button>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-md border border-white/50 overflow-hidden">
            <div className="p-5 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800">Export Options</h2>
            </div>
            <div className="p-5 space-y-3">
              <button
                onClick={handleExportCSV}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-200 rounded-full text-sm font-medium text-gray-700 hover:bg-white/60 transition-all"
              >
                <DocumentArrowDownIcon className="h-5 w-5" />
                Export Predictions (CSV)
              </button>
              <button
                onClick={() => alert('PDF export coming soon. Use CSV export for now.')}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-200 rounded-full text-sm font-medium text-gray-700 hover:bg-white/60 transition-all"
              >
                <DocumentArrowUpIcon className="h-5 w-5" />
                Export Analytics (PDF – planned)
              </button>
            </div>
          </div>
        </div>

        {/* Report preview */}
        <div className="lg:col-span-2">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-md border border-white/50 overflow-hidden">
            <div className="p-5 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800">Preview</h2>
            </div>
            <div className="p-5">
              {renderPreview()}
              <p className="text-xs text-gray-400 mt-4">
                * Data fetched directly from backend. Use "Generate Report" to refresh.
                For full dataset, use the CSV export.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
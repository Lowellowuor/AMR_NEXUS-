// src/pages/Settings.jsx
import { useEffect, useState } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { useThemeStore } from '../stores/themeStore';
import api from '../api/client';

export default function Settings() {
  const { theme, toggleTheme } = useThemeStore();
  const [backendStatus, setBackendStatus] = useState('checking');
  const [modelInfo, setModelInfo] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    const checkBackend = async () => {
      try {
        const health = await api.health();
        setBackendStatus('online');
        setModelInfo({
          service: health.service,
          version: health.version || 'v1.0',
        });
      } catch (err) {
        console.error('Backend unreachable:', err);
        setBackendStatus('offline');
        setModelInfo(null);
      }
    };
    checkBackend();
    // Optionally re-check every 30 seconds
    const interval = setInterval(checkBackend, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const response = await fetch('http://localhost:8000/export/predictions');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `amr_predictions_${new Date().toISOString().slice(0,19)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Could not export data. Is the backend running?');
    } finally {
      setExporting(false);
    }
  };

  const handleClearCache = () => {
    setClearing(true);
    // Clear localStorage items used by the app
    localStorage.removeItem('prediction-storage');
    localStorage.removeItem('theme-storage');
    // Optionally clear other stores
    setTimeout(() => {
      setClearing(false);
      alert('Local cache cleared. Page will reload.');
      window.location.reload();
    }, 500);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      {/* Appearance Section */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-md border border-white/50 overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">Appearance</h2>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-medium text-gray-800">Theme</h3>
              <p className="text-sm text-gray-500">Switch between light and dark mode</p>
            </div>
            <Button onClick={toggleTheme}>
              {theme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode'}
            </Button>
          </div>
        </div>
      </div>

      {/* Backend & Model Section */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-md border border-white/50 overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">System Status</h2>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-medium text-gray-800">Backend API</h3>
              <p className="text-sm text-gray-500">
                {import.meta.env.VITE_API_URL || 'http://localhost:8000'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`inline-flex h-2.5 w-2.5 rounded-full ${
                backendStatus === 'online' ? 'bg-green-500 animate-pulse' : 'bg-red-500'
              }`}></span>
              <span className="text-sm font-medium capitalize">{backendStatus}</span>
            </div>
          </div>
          {modelInfo && (
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-medium text-gray-800">ML Model</h3>
                <p className="text-sm text-gray-500">{modelInfo.service}</p>
              </div>
              <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                {modelInfo.version}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Data Management Section */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-md border border-white/50 overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">Data Management</h2>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-medium text-gray-800">Export Predictions</h3>
              <p className="text-sm text-gray-500">Download all prediction records as CSV</p>
            </div>
            <Button onClick={handleExportCSV} isLoading={exporting}>
              {exporting ? 'Exporting...' : '📥 Export CSV'}
            </Button>
          </div>
          <hr className="border-gray-100" />
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-medium text-gray-800">Clear Local Cache</h3>
              <p className="text-sm text-gray-500">Reset stored preferences and reload app</p>
            </div>
            <Button
              variant="secondary"
              onClick={handleClearCache}
              isLoading={clearing}
              className="bg-red-50 text-red-600 hover:bg-red-100"
            >
              {clearing ? 'Clearing...' : 'Clear Cache'}
            </Button>
          </div>
        </div>
      </div>

      {/* About Section */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-md border border-white/50 overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">About</h2>
        </div>
        <div className="p-5 space-y-2">
          <p className="text-sm text-gray-600">
            <strong>AMR‑Nexus One Health Platform</strong><br />
            Version 1.0.0 | Frontend: React + Vite | Backend: FastAPI + ML
          </p>
          <p className="text-xs text-gray-400 mt-2">
            © {new Date().getFullYear()} AMR‑Nexus. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
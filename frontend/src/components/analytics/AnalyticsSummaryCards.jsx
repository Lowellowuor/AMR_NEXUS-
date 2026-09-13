import { useState, useEffect } from 'react';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import api from '../../api/client';

export default function AnalyticsSummaryCards({
  summary: propSummary = null,
  startDate = '',
  endDate = '',
  county = '',
  pathogenCode = '',
  onRefresh = null,
}) {
  const [summary, setSummary] = useState(propSummary);
  const [loading, setLoading] = useState(!propSummary);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchSummary = async (showLoading = true) => {
    if (propSummary) return;
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      if (county) params.append('county', county);
      if (pathogenCode) params.append('pathogen_code', pathogenCode);
      const qs = params.toString();
      const data = await api.getSummary(qs);
      setSummary(data);
      setLastUpdated(new Date().toLocaleString());
    } catch (err) {
      console.error('Failed to fetch summary:', err);
      setError('Could not load summary data.');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    if (propSummary) {
      setSummary(propSummary);
      setLoading(false);
      return;
    }
    fetchSummary(true);
    const interval = setInterval(() => fetchSummary(false), 60000);
    return () => clearInterval(interval);
  }, [startDate, endDate, county, pathogenCode, propSummary]);

  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
    } else {
      fetchSummary(true);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-[var(--bg-secondary)]/80 backdrop-blur-sm rounded-2xl shadow-md p-5 border border-white/50 animate-pulse">
            <div className="h-4 bg-[var(--border-primary)] rounded w-1/2 mb-2"></div>
            <div className="h-8 bg-[var(--border-primary)] rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[var(--bg-secondary)]/80 backdrop-blur-sm rounded-2xl shadow-md p-5 border border-white/50 text-center">
        <p className="text-[var(--status-critical)]">{error}</p>
        <button onClick={handleRefresh} className="mt-2 text-[var(--accent-teal)] underline text-sm">
          Retry
        </button>
      </div>
    );
  }

  const cards = [
    { label: 'Total Records', value: summary?.total_records?.toLocaleString() || 0, color: 'text-[var(--text-primary)]' },
    { label: 'MDR Rate', value: `${summary?.mdr_rate || 0}%`, color: summary?.mdr_rate > 40 ? 'text-[var(--status-critical)]' : 'text-[var(--status-success)]' },
    { label: 'Anomalies', value: summary?.anomaly_count || 0, color: 'text-[var(--status-warning)]' },
    { label: 'Active Counties', value: summary?.active_counties || 0, color: 'text-[var(--accent-teal)]' },
  ];

  return (
    <div className="relative">
      <div className="flex justify-between items-center mb-3">
        <div className="text-xs text-[var(--text-muted)]">
          {lastUpdated && `Last updated: ${lastUpdated}`}
        </div>
        <button
          onClick={handleRefresh}
          className="p-2 rounded-full hover:bg-[var(--bg-tertiary)] transition-colors"
          title="Refresh summary"
        >
          <ArrowPathIcon className="h-4 w-4 text-[var(--text-muted)]" />
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="bg-[var(--bg-secondary)]/80 backdrop-blur-sm rounded-2xl shadow-md p-5 border border-white/50 hover:shadow-lg transition-shadow"
          >
            <p className="text-sm text-[var(--text-muted)]">{card.label}</p>
            <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
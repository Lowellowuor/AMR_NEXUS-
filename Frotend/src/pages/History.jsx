// src/pages/History.jsx
import { useEffect, useState, useCallback } from 'react';
import Card from '../components/ui/Card';
import HistoryTable from '../components/tables/HistoryTable';
import api from '../api/client';   // assumes default export from client.js

export default function History() {
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPredictions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getPredictions();
      setPredictions(data);
    } catch (err) {
      console.error('Failed to fetch predictions:', err);
      setError('Could not load history. Is the backend running?');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load predictions on mount
  useEffect(() => {
    fetchPredictions();
  }, [fetchPredictions]);

  // Refetch when the page becomes visible (e.g., after coming back from Predict page)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchPredictions();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchPredictions]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Prediction History</h1>
        <button
          onClick={fetchPredictions}
          disabled={loading}
          className="px-3 py-1 text-sm bg-primary-50 text-primary-600 rounded hover:bg-primary-100 disabled:opacity-50"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <Card>
        {loading && (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        )}

        {error && (
          <div className="text-center py-8 text-red-500">
            {error}
          </div>
        )}

        {!loading && !error && predictions.length === 0 && (
          <p className="text-gray-500 text-center py-8">
            No predictions yet. Use the <strong>Predict</strong> page to create one.
          </p>
        )}

        {!loading && !error && predictions.length > 0 && (
          <HistoryTable data={predictions} />
        )}
      </Card>
    </div>
  );
}
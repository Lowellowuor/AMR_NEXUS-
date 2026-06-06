// src/api/client.js
const API_BASE = 'http://localhost:8000';

// Helper to handle fetch responses
async function handleResponse(res) {
  if (!res.ok) {
    let errorMessage = `HTTP ${res.status}: ${res.statusText}`;
    try {
      const errorData = await res.json();
      errorMessage = errorData.detail || errorMessage;
    } catch {
      // ignore if response is not JSON
    }
    throw new Error(errorMessage);
  }
  return res.json();
}

export const api = {
  health: () => fetch(`${API_BASE}/health`).then(handleResponse),

  getSummary: () => fetch(`${API_BASE}/analytics/summary`).then(handleResponse),

  getMDRTrend: (months = 6) =>
    fetch(`${API_BASE}/analytics/mdr_trend?months=${months}`).then(handleResponse),

  getByPathogen: (limit = 10) =>
    fetch(`${API_BASE}/analytics/by_pathogen?limit=${limit}`).then(handleResponse),

  getBySector: () => fetch(`${API_BASE}/analytics/by_sector`).then(handleResponse),

  getTopCounties: (limit = 5) =>
    fetch(`${API_BASE}/analytics/top_counties?limit=${limit}`).then(handleResponse),

  getPredictions: (limit = 50, skip = 0) =>
    fetch(`${API_BASE}/predictions?limit=${limit}&skip=${skip}`).then(handleResponse),

  submitPrediction: (data) =>
    fetch(`${API_BASE}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(handleResponse),
};

export default api;
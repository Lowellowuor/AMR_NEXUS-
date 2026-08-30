const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

async function handleResponse(res) {
  if (!res.ok) {
    let errorMessage = `HTTP ${res.status}: ${res.statusText}`;
    try {
      const errorData = await res.json();
      errorMessage = errorData.detail || errorMessage;
    } catch { }
    throw new Error(errorMessage);
  }
  return res.json();
}

export const api = {
  health: () => fetch(`${API_BASE}/health`).then(handleResponse),
  getSummary: (params = '') => fetch(`${API_BASE}/analytics/summary?${params}`).then(handleResponse),
  getMDRTrend: (months = 6, params = '') => fetch(`${API_BASE}/analytics/mdr_trend?months=${months}&${params}`).then(handleResponse),
  getByPathogen: (limit = 10, params = '') => fetch(`${API_BASE}/analytics/by_pathogen?limit=${limit}&${params}`).then(handleResponse),
  getBySector: (params = '') => fetch(`${API_BASE}/analytics/by_sector?${params}`).then(handleResponse),
  getSectorMonthly: (months = 12) => fetch(`${API_BASE}/analytics/sector_monthly?months=${months}`).then(handleResponse),
  getTopCounties: (limit = 5, params = '') => fetch(`${API_BASE}/analytics/top_counties?limit=${limit}&${params}`).then(handleResponse),
  getPredictions: (limit = 50, skip = 0, params = '') => fetch(`${API_BASE}/predictions?limit=${limit}&skip=${skip}&${params}`).then(handleResponse),
  submitPrediction: (data) => fetch(`${API_BASE}/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(handleResponse),
  getCountyMDR: (params = '') => fetch(`${API_BASE}/analytics/county_mdr?${params}`).then(handleResponse),
  getSubCountyMDR: (params = '') => fetch(`${API_BASE}/analytics/sub_county_mdr?${params}`).then(handleResponse),
  getMDRDifference: (startMonth, endMonth) => fetch(`${API_BASE}/analytics/mdr_difference?start_month=${startMonth}&end_month=${endMonth}`).then(handleResponse),
  getResistanceByPathogenClass: (pathogenCode, params = '') => fetch(`${API_BASE}/analytics/resistance_by_pathogen/${pathogenCode}?${params}`).then(handleResponse),
  getPathogenTrend: (pathogenCode, months = 12, params = '') => fetch(`${API_BASE}/analytics/pathogen_trend?pathogen_code=${pathogenCode}&months=${months}&${params}`).then(handleResponse),
  emailReport: (data) => fetch(`${API_BASE}/reports/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(handleResponse),
  getComments: (recordId) => fetch(`${API_BASE}/predictions/${recordId}/comments`).then(handleResponse),
  addComment: (recordId, data) => fetch(`${API_BASE}/predictions/${recordId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(handleResponse),
  getForecast: (params = '') => fetch(`${API_BASE}/ews/forecast?${params}`).then(handleResponse),
  getRecommendations: (pathogen, antibioticClass) => fetch(`${API_BASE}/recommendations/${pathogen}/${antibioticClass}`).then(handleResponse),
  getAlertExplanation: (alertId) => fetch(`${API_BASE}/alerts/${alertId}/explanation`).then(handleResponse),
  getAlertDetail: (alertId) => fetch(`${API_BASE}/alerts/${alertId}`).then(handleResponse),
  getPredictionExplanation: (recordId) => fetch(`${API_BASE}/predictions/${recordId}/explanation`).then(handleResponse),
  generateLLM: (alertId) => fetch(`${API_BASE}/llm/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ alert_id: alertId }),
  }).then(handleResponse),
  compareWithLLM: (recordA, recordB) => fetch(`${API_BASE}/llm/compare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ record_a: recordA, record_b: recordB }),
  }).then(handleResponse),
  sendSMS: (phone, message) => fetch(`${API_BASE}/send-sms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, message }),
  }).then(handleResponse),
  getMe: () => fetch(`${API_BASE}/me`).then(handleResponse),
  getAlerts: (params = '') => fetch(`${API_BASE}/alerts?${params}`).then(handleResponse),
  getAlertsCount: () => fetch(`${API_BASE}/alerts/count`).then(handleResponse),
  getOptions: () => fetch(`${API_BASE}/metadata/options`).then(handleResponse),
  updatePredictionNote: (recordId, data) => fetch(`${API_BASE}/predictions/${recordId}/note`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(handleResponse),
  getTemplates: () => fetch(`${API_BASE}/templates`).then(handleResponse),
  saveTemplate: (name, formData) => fetch(`${API_BASE}/templates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, form_data: formData })
  }).then(handleResponse),
  deleteTemplate: (id) => fetch(`${API_BASE}/templates/${id}`, {
    method: 'DELETE'
  }).then(handleResponse),
  markAlertRead: (id) => fetch(`${API_BASE}/alerts/${id}/read`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
  }).then(handleResponse),
};

export default api;
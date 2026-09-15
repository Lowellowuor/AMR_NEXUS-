const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const TOKEN_KEY = 'amr-nexus-token';

async function handleResponse(res) {
  if (res.status === 401) {
    localStorage.removeItem(TOKEN_KEY);
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      window.location.assign('/login');
    }
    throw new Error('Session expired. Please sign in again.');
  }

  if (!res.ok) {
    let errorMessage = `HTTP ${res.status}: ${res.statusText}`;
    try {
      const errorData = await res.json();
      if (errorData.detail) {
        errorMessage = Array.isArray(errorData.detail)
          ? errorData.detail.map((e) => e.msg || e).join('; ')
          : errorData.detail;
      } else if (errorData.error) {
        errorMessage = errorData.error;
      }
    } catch {}
    throw new Error(errorMessage);
  }
  return res.json();
}

function authHeaders(extra = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
  const headers = { ...extra };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function authFetch(url, options = {}) {
  const merged = {
    ...options,
    headers: authHeaders(options.headers || {}),
  };
  return fetch(url, merged);
}

export const api = {
  health: () => authFetch(`${API_BASE}/health`).then(handleResponse),
  getSummary: (params = '') => authFetch(`${API_BASE}/analytics/summary?${params}`).then(handleResponse),
  getMDRTrend: (months = 6, params = '') => authFetch(`${API_BASE}/analytics/mdr_trend?months=${months}&${params}`).then(handleResponse),
  getByPathogen: (limit = 10, params = '') => authFetch(`${API_BASE}/analytics/by_pathogen?limit=${limit}&${params}`).then(handleResponse),
  getBySector: (params = '') => authFetch(`${API_BASE}/analytics/by_sector?${params}`).then(handleResponse),
  getSectorMonthly: (months = 12) => authFetch(`${API_BASE}/analytics/sector_monthly?months=${months}`).then(handleResponse),
  getTopCounties: (limit = 5, params = '') => authFetch(`${API_BASE}/analytics/top_counties?limit=${limit}&${params}`).then(handleResponse),
  getPredictions: (limit = 50, skip = 0, params = '') => authFetch(`${API_BASE}/predictions?limit=${limit}&skip=${skip}&${params}`).then(handleResponse),
  getPredictionDetail: (recordId) => authFetch(`${API_BASE}/predictions/${recordId}`).then(handleResponse),
  getPredictionStats: () => authFetch(`${API_BASE}/predictions/stats`).then(handleResponse),
  getModelCard: () => authFetch(`${API_BASE}/ml/model-card`).then(handleResponse),
  getPathogenList: (params = '') => authFetch(`${API_BASE}/analytics/pathogens?${params}`).then(handleResponse),
  getPathogenDetail: (code, params = '') => authFetch(`${API_BASE}/analytics/pathogens/${encodeURIComponent(code)}?${params}`).then(handleResponse),
  getPathogenCompare: (a, b, params = '') => authFetch(`${API_BASE}/analytics/pathogens-compare?a=${encodeURIComponent(a)}&b=${encodeURIComponent(b)}&${params}`).then(handleResponse),
    changePassword: (oldPassword, newPassword) => authFetch(`${API_BASE}/user/change-password`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }) }).then(handleResponse),
  logoutAll: () => authFetch(`${API_BASE}/user/logout-all`, { method: 'POST', headers: { 'Content-Type': 'application/json' } }).then(handleResponse),
  getMySessions: () => authFetch(`${API_BASE}/user/sessions`).then(handleResponse),
  getMyActivity: (limit = 100) => authFetch(`${API_BASE}/user/activity?limit=${limit}`).then(handleResponse),
  exportMyData: () => authFetch(`${API_BASE}/user/export`),
  requestDeletion: (reason) => authFetch(`${API_BASE}/user/delete-request`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason }) }).then(handleResponse),
  comparePeriods: (params = '') => authFetch(`${API_BASE}/analytics/compare_periods?${params}`).then(handleResponse),
  getDashboardSummary: (params = '') => authFetch(`${API_BASE}/analytics/dashboard_summary?${params}`).then(handleResponse),
  getFreshness: () => authFetch(`${API_BASE}/analytics/freshness`).then(handleResponse),
  getCountyRank: (county, params = '') => authFetch(`${API_BASE}/analytics/county_rank?county=${encodeURIComponent(county)}&${params}`).then(handleResponse),
  getCountyDetail: (county, params = '') => authFetch(`${API_BASE}/analytics/county_detail?county=${encodeURIComponent(county)}&${params}`).then(handleResponse),
  getFacilityCoverage: (params = '') => authFetch(`${API_BASE}/analytics/facility_coverage?${params}`).then(handleResponse),
  getTopCountiesWithTrend: (limit = 8, params = '') => authFetch(`${API_BASE}/analytics/top_counties_with_trend?limit=${limit}&${params}`).then(handleResponse),
  getGlassIndicators: (params = '') => authFetch(`${API_BASE}/analytics/glass_indicators?${params}`).then(handleResponse),

  getAuditEvents: (params = '') => authFetch(`${API_BASE}/audit/events?${params}`).then(handleResponse),
  getAuditStats: () => authFetch(`${API_BASE}/audit/stats`).then(handleResponse),
  getAuditMeta: () => authFetch(`${API_BASE}/audit/actions`).then(handleResponse),
  exportAuditCSV: (params = '') => authFetch(`${API_BASE}/audit/export?${params}`),
  generateReport: (params = '') => authFetch(`${API_BASE}/reports/generate?${params}`).then(handleResponse),
  getReportTypes: () => authFetch(`${API_BASE}/reports/types`).then(handleResponse),
  deletePrediction: (recordId) => authFetch(`${API_BASE}/predictions/${recordId}`, { method: 'DELETE' }).then(handleResponse),
  bulkDeletePredictions: (ids) => authFetch(`${API_BASE}/predictions/bulk-delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids }),
  }).then(handleResponse),
  exportPredictionsCSV: (params = '') => authFetch(`${API_BASE}/predictions/export/csv?${params}`),
  submitPrediction: (data) => authFetch(`${API_BASE}/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then(handleResponse),
  getCountyMDR: (params = '') => authFetch(`${API_BASE}/analytics/county_mdr?${params}`).then(handleResponse),
  getSubCountyMDR: (params = '') => authFetch(`${API_BASE}/analytics/sub_county_mdr?${params}`).then(handleResponse),
  getMDRDifference: (startMonth, endMonth) => authFetch(`${API_BASE}/analytics/mdr_difference?start_month=${startMonth}&end_month=${endMonth}`).then(handleResponse),
  getResistanceByPathogenClass: (pathogenCode, params = '') => authFetch(`${API_BASE}/analytics/resistance_by_pathogen/${pathogenCode}?${params}`).then(handleResponse),
  getPathogenTrend: (pathogenCode, months = 12, params = '') => authFetch(`${API_BASE}/analytics/pathogen_trend?pathogen_code=${pathogenCode}&months=${months}&${params}`).then(handleResponse),
  getPathogenAntibioticMatrix: (params = '') => authFetch(`${API_BASE}/analytics/pathogen_antibiotic_matrix?${params}`).then(handleResponse),
  getMonthRange: () => authFetch(`${API_BASE}/analytics/month_range`).then(handleResponse),
  emailReport: (data) => authFetch(`${API_BASE}/reports/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then(handleResponse),
  getComments: (recordId) => authFetch(`${API_BASE}/predictions/${recordId}/comments`).then(handleResponse),
  addComment: (recordId, data) => authFetch(`${API_BASE}/predictions/${recordId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then(handleResponse),
  getForecast: (params = '') => authFetch(`${API_BASE}/ews/forecast?${params}`).then(handleResponse),
  getRecommendations: (pathogen, antibioticClass) => authFetch(`${API_BASE}/recommendations/${pathogen}/${antibioticClass}`).then(handleResponse),
  getAlertExplanation: (alertId) => authFetch(`${API_BASE}/alerts/${alertId}/explanation`).then(handleResponse),
  getAlertDetail: (alertId) => authFetch(`${API_BASE}/alerts/${alertId}`).then(handleResponse),
  getPredictionExplanation: (recordId) => authFetch(`${API_BASE}/predictions/${recordId}/explanation`).then(handleResponse),
  generateLLM: (alertId) => authFetch(`${API_BASE}/llm/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ alert_id: alertId }),
  }).then(handleResponse),
  generateInsight: (context, data) => authFetch(`${API_BASE}/llm/insight`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ context, data }),
  }).then(handleResponse),
  compareWithLLM: (recordA, recordB) => authFetch(`${API_BASE}/llm/compare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ record_a: recordA, record_b: recordB }),
  }).then(handleResponse),
  sendSMS: (phone, message) => authFetch(`${API_BASE}/send-sms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, message }),
  }).then(handleResponse),
  getMe: () => authFetch(`${API_BASE}/me`).then(handleResponse),
  getAlerts: (params = '') => authFetch(`${API_BASE}/alerts?${params}`).then(handleResponse),
  getAlertsCount: () => authFetch(`${API_BASE}/alerts/count`).then(handleResponse),
  getAlertStats: () => authFetch(`${API_BASE}/alerts/stats`).then(handleResponse),
  acknowledgeAlert: (id) => authFetch(`${API_BASE}/alerts/${id}/acknowledge`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' } }).then(handleResponse),
  resolveAlert: (id, payload) => authFetch(`${API_BASE}/alerts/${id}/resolve`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).then(handleResponse),
  assignAlert: (id, assignedTo) => authFetch(`${API_BASE}/alerts/${id}/assign`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ assigned_to: assignedTo }) }).then(handleResponse),
  bulkAcknowledgeAlerts: (ids) => authFetch(`${API_BASE}/alerts/bulk-acknowledge`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }) }).then(handleResponse),

  getOptions: () => authFetch(`${API_BASE}/metadata/options`).then(handleResponse),
  updatePredictionNote: (recordId, data) => authFetch(`${API_BASE}/predictions/${recordId}/note`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then(handleResponse),
  getTemplates: () => authFetch(`${API_BASE}/api/v1/templates`).then(handleResponse),
  saveTemplate: (name, formData) => authFetch(`${API_BASE}/api/v1/templates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, form_data: formData }),
  }).then(handleResponse),
  deleteTemplate: (id) => authFetch(`${API_BASE}/api/v1/templates/${id}`, {
    method: 'DELETE',
  }).then(handleResponse),
  markAlertRead: (id) => authFetch(`${API_BASE}/alerts/${id}/read`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
  }).then(handleResponse),
  getHotspots: (params = '') => authFetch(`${API_BASE}/hotspots?${params}`).then(handleResponse),
  createHotspot: (data) => authFetch(`${API_BASE}/hotspots`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then(handleResponse),
  updateHotspot: (id, data) => authFetch(`${API_BASE}/hotspots/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then(handleResponse),
  deleteHotspot: (id) => authFetch(`${API_BASE}/hotspots/${id}`, {
    method: 'DELETE',
  }).then(handleResponse),
};

export default api;

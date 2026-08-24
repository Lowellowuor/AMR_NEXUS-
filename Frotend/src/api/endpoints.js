import api from './client';

export const getOptions = () => api.getOptions();

export const getMe = () => api.getMe();

export const fetchSummary = async ({ queryKey }) => {
  const [, county] = queryKey;
  const params = county && county !== 'national' ? `county=${encodeURIComponent(county)}` : '';
  const summary = await api.getSummary(params);
  return {
    totalIsolates: summary.total_records ?? 0,
    activeAnomalies: summary.anomaly_count ?? 0,
    countiesReporting: summary.active_counties ?? 0,
    oneHealthSignals: summary.one_health_signals ?? null,
    mdrRate: summary.mdr_rate ?? 0,
  };
};

export const getMDRTrend = (months = 6, params = '') =>
  api.getMDRTrend(months, params);

export const getSectorMonthly = (months = 12) =>
  api.getSectorMonthly(months);

export const getResistanceByPathogen = (limit = 10) =>
  api.getByPathogen(limit);

export const getResistanceBySector = () => api.getBySector();

export const getTopCounties = (limit = 5) => api.getTopCounties(limit);

export const getResistanceByPathogenClass = (pathogenCode, params = '') =>
  api.getResistanceByPathogenClass(pathogenCode, params);

export const getPathogenTrend = (pathogenCode, months = 12, params = '') =>
  api.getPathogenTrend(pathogenCode, months, params);

export const getPredictionHistory = (params = {}) => {
  const { limit = 50, skip = 0 } = params;
  const query = new URLSearchParams();
  if (limit) query.append('limit', limit);
  if (skip) query.append('skip', skip);
  Object.entries(params).forEach(([key, value]) => {
    if (key !== 'limit' && key !== 'skip' && value !== undefined && value !== null && value !== '') {
      query.append(key, value);
    }
  });
  return api.getPredictions(limit, skip, query.toString());
};

export const fetchSubCountyMDR = () => api.getSubCountyMDR();

export const fetchMDRDifference = (startMonth, endMonth) =>
  api.getMDRDifference(startMonth, endMonth);

export const fetchAlerts = ({ queryKey }) => {
  const [, county] = queryKey;
  const params = county && county !== 'national' ? `county=${encodeURIComponent(county)}` : '';
  return api.getAlerts(params);
};

export const fetchAlertDetail = (alertId) => api.getAlertDetail(alertId);

export const fetchAlertExplanation = (alertId) =>
  api.getAlertExplanation(alertId);

export const fetchAlertGuidance = async ({ alertId }) => {
  const alert = await fetchAlertDetail(alertId);
  if (!alert) {
    return {
      summaryText: '',
      recommendations: [],
      actionChecklist: [],
      references: [],
    };
  }

  try {
    const recs = await api.getRecommendations(alert.pathogen, alert.drugClass);
    return {
      summaryText: recs.summary_text || 'Recommendations based on current resistance patterns.',
      recommendations: recs.recommendations || [],
      actionChecklist: recs.action_checklist || [],
      references: recs.references || [],
    };
  } catch {
    return {
      summaryText: alert.guidance?.summary_text || 'No guidance available.',
      recommendations: alert.guidance?.recommendations || [],
      actionChecklist: alert.guidance?.action_checklist || [],
      references: alert.guidance?.references || [],
    };
  }
};

export const generateLLMResponse = (alertId) => api.generateLLM(alertId);

export const fetchTrends = ({ queryKey }) => {
  const [, pathogen, drug, region, months] = queryKey;
  const params = new URLSearchParams();
  if (pathogen) params.append('pathogen_code', pathogen);
  if (drug) params.append('antibiotic_class', drug);
  if (region) params.append('county', region);
  return api.getMDRTrend(months || 6, params.toString());
};
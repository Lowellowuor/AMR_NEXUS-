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

export const getResistanceByPathogen = (limit = 10, params = '') =>
  api.getByPathogen(limit, params);

export const getResistanceBySector = () => api.getBySector();

export const getTopCounties = (limit = 5) => api.getTopCounties(limit);

export const getResistanceByPathogenClass = (pathogenCode, params = '') =>
  api.getResistanceByPathogenClass(pathogenCode, params);

export const getPathogenTrend = (pathogenCode, months = 12, params = '') =>
  api.getPathogenTrend(pathogenCode, months, params);

export const getPathogenAntibioticMatrix = (params = '') =>
  api.getPathogenAntibioticMatrix(params);

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

export const fetchPredictionExplanation = (recordId) =>
  api.getPredictionExplanation(recordId);

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

export const compareWithLLM = (recordA, recordB) =>
  api.compareWithLLM(recordA, recordB);

export const fetchTrends = ({ queryKey }) => {
  const [, pathogen, drug, region, months] = queryKey;
  const params = new URLSearchParams();
  if (pathogen) params.append('pathogen_code', pathogen);
  if (drug) params.append('antibiotic_class', drug);
  if (region) params.append('county', region);
  return api.getMDRTrend(months || 6, params.toString());
};

// Hotspot functions (using specific API client methods)
export const fetchHotspots = (params = {}) => {
  const query = new URLSearchParams(params).toString();
  return api.getHotspots(query);
};

export const createHotspot = (data) => api.createHotspot(data);

export const updateHotspot = (id, data) => api.updateHotspot(id, data);

export const deleteHotspot = (id) => api.deleteHotspot(id);
export const getMonthRange = () => api.getMonthRange();
export const getModelCard = () => api.getModelCard();

export const generateReport = (params = '') => api.generateReport(params);
export const getReportTypes = () => api.getReportTypes();
export const getAlertStats = () => api.getAlertStats();
export const acknowledgeAlert = (id) => api.acknowledgeAlert(id);
export const resolveAlert = (id, payload) => api.resolveAlert(id, payload);
export const assignAlert = (id, assignedTo) => api.assignAlert(id, assignedTo);
export const bulkAcknowledgeAlerts = (ids) => api.bulkAcknowledgeAlerts(ids);
export const getAuditEvents = (params = '') => api.getAuditEvents(params);
export const getAuditStats = () => api.getAuditStats();
export const getAuditMeta = () => api.getAuditMeta();
export const exportAuditCSV = (params = '') => api.exportAuditCSV(params);
export const getPathogenList = (params = '') => api.getPathogenList(params);
export const getPathogenDetail = (code, params = '') => api.getPathogenDetail(code, params);
export const getPathogenCompare = (a, b, params = '') => api.getPathogenCompare(a, b, params);
export const getDashboardSummary = (params = '') => api.getDashboardSummary(params);
export const getFreshness = () => api.getFreshness();
export const getCountyRank = (county, params = '') => api.getCountyRank(county, params);
export const getCountyDetail = (county, params = '') => api.getCountyDetail(county, params);
export const getFacilityCoverage = (params = '') => api.getFacilityCoverage(params);
export const getTopCountiesWithTrend = (limit = 8, params = '') => api.getTopCountiesWithTrend(limit, params);
export const getGlassIndicators = (params = '') => api.getGlassIndicators(params);

export const changePassword = (oldPw, newPw) => api.changePassword(oldPw, newPw);
export const logoutAll = () => api.logoutAll();
export const getMySessions = () => api.getMySessions();
export const getMyActivity = (limit = 100) => api.getMyActivity(limit);
export const exportMyData = () => api.exportMyData();
export const requestDeletion = (reason) => api.requestDeletion(reason);

// Auto-added missing exports
export const getSubCountyMDR = (params = '') => api.getSubCountyMDR(params);
export const getMDRDifference = (startMonth, endMonth) => api.getMDRDifference(startMonth, endMonth);
export const getCountyMDR = (params = '') => api.getCountyMDR(params);
export const getAlertsCount = () => api.getAlertsCount();
export const getPredictionExplanation = (recordId) => api.getPredictionExplanation(recordId);
export const getAlertExplanation = (alertId) => api.getAlertExplanation(alertId);
export const getAlertDetail = (alertId) => api.getAlertDetail(alertId);
export const sendSMS = (phone, message) => api.sendSMS(phone, message);
export const emailReport = (data) => api.emailReport(data);
export const getComments = (recordId) => api.getComments(recordId);
export const addComment = (recordId, data) => api.addComment(recordId, data);
export const updatePredictionNote = (recordId, data) => api.updatePredictionNote(recordId, data);
export const getTemplates = () => api.getTemplates();
export const saveTemplate = (name, formData) => api.saveTemplate(name, formData);
export const deleteTemplate = (id) => api.deleteTemplate(id);
export const markAlertRead = (id) => api.markAlertRead(id);
export const getForecast = (params = '') => api.getForecast(params);
export const getRecommendations = (p, a) => api.getRecommendations(p, a);
export const comparePeriods = (params = '') => api.comparePeriods(params);
export const generateInsight = (context, data) => api.generateInsight(context, data);
export const getModelRegistry = () => api.getModelRegistry();
export const getActiveModel = () => api.getActiveModel();
export const getModelPerformance = (days = 90) => api.getModelPerformance(days);
export const getModelCalibration = (days = 90) => api.getModelCalibration(days);
export const getModelDrift = (days = 30) => api.getModelDrift(days);
export const getRecentPredictions = (limit = 50) => api.getRecentPredictions(limit);
export const confirmOutcome = (recordId, actualMdr, notes) => api.confirmOutcome(recordId, actualMdr, notes);
export const getConfirmedStats = (days = 90) => api.getConfirmedStats(days);
export const getRecentConfirmations = (limit = 20) => api.getRecentConfirmations(limit);
export const listUsers = (search = '') => api.listUsers(search);
export const createUser = (data) => api.createUser(data);
export const updateUser = (id, data) => api.updateUser(id, data);
export const resetUserPassword = (id) => api.resetUserPassword(id);
export const disableUser = (id) => api.disableUser(id);
export const forceChangePassword = (newPassword) => api.forceChangePassword(newPassword);
export const getNotificationPrefs = () => api.getNotificationPrefs();
export const updateNotificationPrefs = (data) => api.updateNotificationPrefs(data);
export const getNotificationStatus = () => api.getNotificationStatus();
export const getNotificationLog = (params = '') => api.getNotificationLog(params);
export const sendNotification = (data) => api.sendNotification(data);

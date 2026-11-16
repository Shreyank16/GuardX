import { api } from './api'
import {
  normalizeAlert,
  normalizeApplication,
  normalizeApplicationHistory,
  normalizeAuth,
  normalizeEndpoint,
  normalizeFim,
  normalizeHealth,
  normalizePowerShell,
  normalizeRule,
  normalizeThreatIncident,
  unwrapList,
} from './normalize'

/**
 * Browser client for the GuardX Node.js/Express service.
 * Wazuh credentials stay on that server. This module only calls same-origin /api routes.
 *
 * Expected routes:
 * GET /api/health (required)
 * GET /api/alerts?range (required in live mode)
 * GET /api/endpoints (optional / staged)
 * GET /api/fim?range (optional / staged)
 * GET /api/authentication?range (optional / staged)
 * GET /api/powershell?range (optional / staged)
 * GET /api/rules (optional / staged)
 * GET /api/applications (optional / staged)
 * GET /api/applications/history (optional / staged)
 * GET /api/threat-intel (optional / staged)
 * GET /api/threat-intel/:id (optional / staged)
 * POST /api/threat-intel/analyze (optional / staged)
 */

function collection(payload, normalize) {
  const { items, recognized } = unwrapList(payload)
  return {
    items: items.map((item, index) => normalize(item || {}, index)),
    recognized,
    total: typeof payload?.total_affected_items === 'number' ? payload.total_affected_items : items.length,
    metrics: payload?.metrics || null,
    publishers: Array.isArray(payload?.publishers) ? payload.publishers : [],
  }
}

export async function checkHealth() {
  const response = await api.get('/health')
  return normalizeHealth(response.data)
}

export async function getApplications(params = {}) {
  const response = await api.get('/applications', { params })
  return collection(response.data, normalizeApplication)
}

export async function getApplicationHistory(params = {}) {
  const response = await api.get('/applications/history', { params })
  return collection(response.data, normalizeApplicationHistory)
}

export async function getThreatIntel(params = {}) {
  const response = await api.get('/threat-intel', { params })
  const coll = collection(response.data, normalizeThreatIncident)
  return {
    ...coll,
    status: response.data?.status || null,
  }
}

export async function getThreatIncident(id) {
  const response = await api.get(`/threat-intel/${id}`)
  return normalizeThreatIncident(response.data, 0)
}

export async function triggerThreatAnalysis(data = {}) {
  const response = await api.post('/threat-intel/analyze', data)
  return response.data
}

/**
 * Resilient request helper for optional telemetry endpoints.
 * Returns an empty collection structure if an optional endpoint is not yet implemented (HTTP 404/501),
 * while capturing warnings so partial availability can be clearly distinguished without failing the snapshot.
 */
async function getOptional(path, params, name) {
  try {
    const res = await api.get(path, params ? { params } : undefined)
    return { data: res.data, available: true }
  } catch (err) {
    const status = err?.response?.status
    const isPending = status === 404 || status === 501
    return {
      data: { affected_items: [] },
      available: false,
      warning: isPending
        ? `${name} API endpoint pending implementation (HTTP ${status}).`
        : `${name} API request failed (${err.message}).`,
    }
  }
}

export async function loadSnapshot(range, agentId) {
  const params = { range }
  const rulesParams = {}
  const appParams = {}
  if (agentId && agentId !== 'all') {
    params.agentId = agentId
    rulesParams.agentId = agentId
    appParams.agentId = agentId
  }

  // Required core endpoints: /health and /alerts must succeed
  // Optional telemetry endpoints: degraded gracefully if not yet implemented
  const [healthRes, alertsRes, endpointsRes, fimRes, authRes, powershellRes, rulesRes, appsRes, appHistoryRes, threatRes] =
    await Promise.all([
      api.get('/health'),
      api.get('/alerts', { params }),
      getOptional('/endpoints', null, 'Endpoints'),
      getOptional('/fim', params, 'File integrity'),
      getOptional('/authentication', params, 'Authentication'),
      getOptional('/powershell', params, 'PowerShell'),
      getOptional('/rules', rulesParams, 'Rules'),
      getOptional('/applications', appParams, 'Applications'),
      getOptional('/applications/history', appParams, 'Application History'),
      getOptional('/threat-intel', appParams, 'Threat intelligence'),
    ])

  const alertCollection = collection(alertsRes.data, normalizeAlert)
  const endpointCollection = collection(endpointsRes.data, normalizeEndpoint)
  const fimCollection = collection(fimRes.data, normalizeFim)
  const authCollection = collection(authRes.data, normalizeAuth)
  const powershellCollection = collection(powershellRes.data, normalizePowerShell)
  const ruleCollection = collection(rulesRes.data, normalizeRule)
  const appCollection = collection(appsRes.data, normalizeApplication)
  const appHistoryCollection = collection(appHistoryRes.data, normalizeApplicationHistory)
  const threatCollection = collection(threatRes.data, normalizeThreatIncident)

  const warnings = []
  if (endpointsRes.warning) warnings.push(endpointsRes.warning)
  if (fimRes.warning) warnings.push(fimRes.warning)
  if (authRes.warning) warnings.push(authRes.warning)
  if (powershellRes.warning) warnings.push(powershellRes.warning)
  if (rulesRes.warning) warnings.push(rulesRes.warning)
  if (appsRes.warning) warnings.push(appsRes.warning)
  if (appHistoryRes.warning) warnings.push(appHistoryRes.warning)
  if (threatRes.warning) warnings.push(threatRes.warning)

  if (!alertCollection.recognized) warnings.push('Alerts response shape was not recognized.')
  if (!endpointCollection.recognized && endpointsRes.available) {
    warnings.push('Endpoints response shape was not recognized.')
  }
  if (!fimCollection.recognized && fimRes.available) {
    warnings.push('File integrity response shape was not recognized.')
  }
  if (!authCollection.recognized && authRes.available) {
    warnings.push('Authentication response shape was not recognized.')
  }
  if (!powershellCollection.recognized && powershellRes.available) {
    warnings.push('PowerShell response shape was not recognized.')
  }
  if (!ruleCollection.recognized && rulesRes.available) {
    warnings.push('Rules response shape was not recognized.')
  }
  if (!appCollection.recognized && appsRes.available) {
    warnings.push('Applications response shape was not recognized.')
  }
  if (!appHistoryCollection.recognized && appHistoryRes.available) {
    warnings.push('Application History response shape was not recognized.')
  }
  if (!threatCollection.recognized && threatRes.available) {
    warnings.push('Threat Intelligence response shape was not recognized.')
  }

  return {
    health: normalizeHealth(healthRes.data),
    alerts: alertCollection.items,
    endpoints: endpointCollection.items,
    fim: fimCollection.items,
    fimMetrics: fimCollection.metrics,
    fimTotal: fimCollection.total,
    authentication: authCollection.items,
    authMetrics: authCollection.metrics,
    authTotal: authCollection.total,
    powershell: powershellCollection.items,
    powershellMetrics: powershellCollection.metrics,
    powershellTotal: powershellCollection.total,
    rules: ruleCollection.items,
    rulesMetrics: ruleCollection.metrics,
    rulesTotal: ruleCollection.total,
    applications: appCollection.items,
    applicationsMetrics: appCollection.metrics,
    applicationsTotal: appCollection.total,
    applicationsHistory: appHistoryCollection.items,
    applicationsPublishers: appCollection.publishers,
    threatIntel: threatCollection.items,
    threatIntelMetrics: threatRes.data?.metrics || null,
    threatIntelStatus: threatRes.data?.status || null,
    threatIntelTotal: threatCollection.total,
    available: {
      health: true,
      alerts: true,
      endpoints: endpointsRes.available,
      fim: fimRes.available,
      authentication: authRes.available,
      powershell: powershellRes.available,
      rules: rulesRes.available,
      applications: appsRes.available,
      applicationsHistory: appHistoryRes.available,
      threatIntel: threatRes.available,
    },
    warnings,
  }
}

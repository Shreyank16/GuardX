import { severityFromLevel } from '../utils/severity'

export function unwrapList(payload) {
  if (Array.isArray(payload)) return { items: payload, recognized: true }
  if (payload && Array.isArray(payload.data)) return { items: payload.data, recognized: true }
  if (payload && Array.isArray(payload.items)) return { items: payload.items, recognized: true }
  if (payload && Array.isArray(payload.affected_items)) return { items: payload.affected_items, recognized: true }
  if (payload == null) return { items: [], recognized: true }
  return { items: [], recognized: false }
}

function text(value) {
  if (value == null) return null
  if (typeof value === 'object') return null
  const trimmed = String(value).trim()
  return trimmed || null
}

function osName(raw) {
  if (typeof raw.os === 'string') return raw.os
  if (raw.os && typeof raw.os === 'object') return text(raw.os.name || raw.os.platform)
  return text(raw.operatingSystem)
}

export function normalizeHealth(raw) {
  const data = raw && typeof raw === 'object' ? raw : {}
  return {
    ok: data.ok === true || data.status === 'ok',
    manager: data.manager ?? null,
    indexer: data.indexer ?? null,
    dashboard: data.dashboard ?? null,
    version: text(data.version),
    checkedAt: text(data.checkedAt) || new Date().toISOString(),
    message: text(data.message),
  }
}

export function normalizeAlert(raw, index) {
  const level = Number(raw.level ?? raw.rule?.level ?? 0)
  return {
    id: text(raw.id) || `api-alert-${index}`,
    synthetic: Boolean(raw.synthetic),
    timestamp: text(raw.timestamp || raw['@timestamp'] || raw.date),
    severity: text(raw.severity) || severityFromLevel(level),
    level: Number.isNaN(level) ? 0 : level,
    endpoint: text(raw.endpoint || raw.agent?.name) || 'Unknown',
    agentId: text(raw.agentId || raw.agent?.id),
    ruleId: text(raw.ruleId || raw.rule?.id),
    ruleDescription: text(raw.ruleDescription || raw.rule?.description),
    description: text(raw.description || raw.rule?.description) || 'Alert',
    status: text(raw.status) || 'open',
    sourceIp: text(raw.sourceIp || raw.data?.srcip),
    username: text(raw.username || raw.data?.win?.eventdata?.targetUserName),
    eventId: text(raw.eventId || raw.data?.win?.system?.eventID),
    logonType: raw.logonType ?? raw.data?.win?.eventdata?.logonType ?? null,
    provider: text(raw.provider || raw.data?.win?.system?.providerName),
    scriptBlock: text(raw.scriptBlock || raw.data?.win?.eventdata?.scriptBlockText),
    kind: 'alert',
    raw: raw.raw && typeof raw.raw === 'object' ? raw.raw : raw,
  }
}

export function normalizeEndpoint(raw, index) {
  const status = text(raw.status)?.toLowerCase()
  return {
    id: text(raw.id || raw.agentId) || `endpoint-${index}`,
    name: text(raw.name) || 'Unknown',
    agentId: text(raw.agentId || raw.id) || 'Unknown',
    ip: text(raw.ip || raw.ipAddress || raw.registerIP),
    os: osName(raw),
    version: text(raw.version || raw.agentVersion),
    status: ['online', 'offline', 'unverified'].includes(status) ? status : 'unverified',
    lastKeepAlive: text(raw.lastKeepAlive || raw.lastKeepalive),
    groups: Array.isArray(raw.groups) ? raw.groups.map((group) => String(group)) : [],
    note: text(raw.note),
  }
}

export function normalizeRule(raw, index) {
  const level = Number(raw.level ?? 0)
  const alertCount = typeof raw.alertCount === 'number' ? raw.alertCount : 0
  const hasAlerts = Boolean(raw.hasAlerts || alertCount > 0)
  const liveAlertsVerified = raw.liveAlertsVerified === true || hasAlerts
  return {
    id: text(raw.id || raw.ruleId) || `rule-${index}`,
    name: text(raw.name || raw.description) || 'Untitled rule',
    description: text(raw.description) || '',
    level: Number.isNaN(level) ? 0 : level,
    severity: severityFromLevel(level),
    group: text(raw.group || (Array.isArray(raw.groups) ? raw.groups[0] : null)) || 'ungrouped',
    groups: Array.isArray(raw.groups) ? raw.groups : [],
    status: text(raw.status) || 'enabled',
    filename: text(raw.filename) || null,
    relative_dirname: text(raw.relative_dirname) || null,
    eventId: text(raw.eventId),
    parentRule: text(raw.parentRule),
    alertCount,
    lastAlert: text(raw.lastAlert),
    hasAlerts,
    liveAlertsVerified,
    verification: text(raw.verification) || (liveAlertsVerified ? 'Live alert verified' : 'Configured (No alerts recorded)'),
    verificationNote: text(raw.verificationNote) || (liveAlertsVerified ? `Live alert verified (${alertCount} alerts recorded).` : 'Configured on Wazuh Manager.'),
    mitre: Array.isArray(raw.mitre) ? raw.mitre : [],
    details: raw.details && typeof raw.details === 'object' ? raw.details : {},
    raw: raw.raw && typeof raw.raw === 'object' ? raw.raw : raw,
  }
}

export function normalizeFim(raw, index) {
  const path = text(raw.path || raw.syscheck?.path)
  const isRegistry = path ? path.trim().toUpperCase().startsWith('HKEY_') : false
  const objectType = raw.objectType || (isRegistry ? 'registry' : 'file')
  const action = text(raw.action || raw.syscheck?.event)?.toLowerCase()
  return {
    id: text(raw.id) || `api-fim-${index}`,
    synthetic: Boolean(raw.synthetic),
    timestamp: text(raw.timestamp || raw['@timestamp']),
    endpoint: text(raw.endpoint || raw.agent?.name) || 'Unknown',
    agentId: text(raw.agentId || raw.agent?.id),
    objectType,
    action: ['created', 'modified', 'deleted'].includes(action) ? action : action || 'modified',
    path,
    user: text(raw.user || raw.syscheck?.uname),
    checksum: text(raw.checksum || raw.syscheck?.sha256),
    severity: 'informational',
    ruleId: text(raw.ruleId),
    kind: 'fim',
    description: text(raw.description) || `${objectType === 'registry' ? 'Registry' : 'File'} event ${action || ''}`.trim(),
    raw: raw.raw && typeof raw.raw === 'object' ? raw.raw : raw,
  }
}

export function normalizeAuth(raw, index) {
  const eventId = text(raw.eventId || raw.data?.win?.system?.eventID)
  const resultText = text(raw.result || raw.outcome)?.toLowerCase()
  const result = eventId === '4625' ? 'failure' : eventId === '4624' ? 'success' : resultText || 'unknown'
  return {
    id: text(raw.id) || `api-auth-${index}`,
    synthetic: Boolean(raw.synthetic),
    timestamp: text(raw.timestamp || raw['@timestamp']),
    endpoint: text(raw.endpoint || raw.agent?.name) || 'Unknown',
    agentId: text(raw.agentId || raw.agent?.id),
    result,
    outcome: result,
    eventId,
    username: text(raw.username || raw.data?.win?.eventdata?.targetUserName),
    domain: text(raw.domain || raw.data?.win?.eventdata?.targetDomainName),
    workstation: text(raw.workstation || raw.data?.win?.eventdata?.workstationName),
    logonType: raw.logonType ?? raw.data?.win?.eventdata?.logonType ?? null,
    sourceIp: text(raw.sourceIp || raw.data?.win?.eventdata?.ipAddress),
    ruleId: text(raw.ruleId || raw.rule?.id),
    alertId: text(raw.alertId),
    provider: text(raw.provider || raw.data?.win?.system?.providerName) || 'Microsoft-Windows-Security-Auditing',
    kind: 'authentication',
    description: text(raw.description || raw.rule?.description) || `Authentication ${result}`,
    raw: raw.raw && typeof raw.raw === 'object' ? raw.raw : raw,
  }
}

export function normalizePowerShell(raw, index) {
  const ruleId = text(raw.ruleId || raw.rule?.id)
  const scriptText = text(raw.scriptText || raw.scriptBlock || raw.data?.win?.eventdata?.scriptBlockText)
  const user = text(raw.user || raw.username || raw.data?.win?.eventdata?.userId || raw.data?.win?.system?.computer)
  return {
    id: text(raw.id) || `api-ps-${index}`,
    synthetic: Boolean(raw.synthetic),
    timestamp: text(raw.timestamp || raw['@timestamp']),
    endpoint: text(raw.endpoint || raw.agent?.name) || 'Unknown',
    agentId: text(raw.agentId || raw.agent?.id),
    eventId: text(raw.eventId || raw.data?.win?.system?.eventID) || null,
    eventType: text(raw.eventType) || (text(raw.eventId || raw.data?.win?.system?.eventID) === '4104' ? 'script_block' : 'powershell_event'),
    provider: text(raw.provider || raw.data?.win?.system?.providerName) || 'Microsoft-Windows-PowerShell',
    scriptBlockId: text(raw.scriptBlockId || raw.data?.win?.eventdata?.scriptBlockId),
    scriptBlock: scriptText,
    scriptText,
    command: text(raw.command || raw.data?.win?.eventdata?.commandName),
    user,
    host: text(raw.host || raw.data?.win?.eventdata?.hostName || raw.data?.win?.system?.computer),
    processId: text(raw.processId || raw.data?.win?.system?.processID),
    path: text(raw.path || raw.data?.win?.eventdata?.path),
    ruleId,
    alertId: text(raw.alertId),
    classification: text(raw.classification) || (ruleId ? 'rule-match' : 'monitored'),
    severity: ruleId ? severityFromLevel(raw.level ?? raw.rule?.level ?? 8) : 'informational',
    username: user,
    kind: 'powershell',
    description: text(raw.description || raw.rule?.description) || (ruleId ? `PowerShell event with rule ${ruleId}` : 'PowerShell script block monitored'),
    raw: raw.raw && typeof raw.raw === 'object' ? raw.raw : raw,
  }
}

export function normalizeApplication(raw, index) {
  return {
    id: text(raw.id) || `app-${index}`,
    synthetic: Boolean(raw.synthetic),
    name: text(raw.name) || 'Unknown Application',
    version: text(raw.version) || 'Unknown',
    publisher: text(raw.publisher || raw.vendor) || 'Unknown',
    architecture: text(raw.architecture) || 'x86_64',
    installDate: text(raw.installDate || raw.install_time) || null,
    location: text(raw.location) || null,
    format: text(raw.format) || 'win',
    endpoint: text(raw.endpoint || raw.agent?.name) || 'Unknown',
    agentId: text(raw.agentId || raw.agent?.id || raw.agent_id) || 'Unknown',
    scanTime: text(raw.scanTime || raw.scan?.time) || null,
    lastObserved: text(raw.lastObserved || raw.scanTime || raw.installDate || raw.scan?.time) || null,
    description: text(raw.description) || null,
    size: typeof raw.size === 'number' ? raw.size : null,
    raw: raw.raw && typeof raw.raw === 'object' ? raw.raw : raw,
  }
}

export function normalizeApplicationHistory(raw, index) {
  return {
    id: text(raw.id) || `app-hist-${index}`,
    synthetic: Boolean(raw.synthetic),
    agentId: text(raw.agentId || raw.agent?.id) || 'Unknown',
    endpoint: text(raw.endpoint || raw.agent?.name) || 'Unknown',
    appName: text(raw.appName || raw.name) || 'Unknown Application',
    previousVersion: text(raw.previousVersion) || null,
    newVersion: text(raw.newVersion) || null,
    changeType: text(raw.changeType) || 'Newly detected',
    timestamp: text(raw.timestamp || raw.detectionTimestamp || raw['@timestamp']),
    detectionTimestamp: text(raw.detectionTimestamp || raw.timestamp),
    correlatedEventId: text(raw.correlatedEventId) || null,
    ruleId: text(raw.ruleId) || null,
    details: text(raw.details) || null,
    confirmedByEvent: Boolean(raw.confirmedByEvent),
    raw: raw.raw && typeof raw.raw === 'object' ? raw.raw : raw,
  }
}

export function normalizeThreatIncident(raw, index) {
  return {
    id: text(raw.id) || `incident-${index}`,
    synthetic: Boolean(raw.synthetic),
    title: text(raw.title) || 'Suspicious Security Incident',
    suspectedAttackType: text(raw.suspectedAttackType) || 'Other Suspicious Activity',
    explanation: text(raw.explanation) || '',
    severity: text(raw.severity)?.toLowerCase() || 'medium',
    confidence: typeof raw.confidence === 'number' ? raw.confidence : 0.75,
    confidenceReasoning: text(raw.confidenceReasoning) || '',
    mitreTactic: text(raw.mitreTactic) || 'Initial Access',
    mitreTechniqueId: text(raw.mitreTechniqueId) || 'T1078',
    mitreTechniqueName: text(raw.mitreTechniqueName) || 'Valid Accounts',
    affectedEndpoint: text(raw.affectedEndpoint || raw.endpoint || raw.agent?.name) || 'Unknown',
    agentId: text(raw.agentId || raw.agent?.id) || 'Unknown',
    firstSeen: text(raw.firstSeen) || null,
    lastSeen: text(raw.lastSeen) || null,
    eventCount: typeof raw.eventCount === 'number' ? raw.eventCount : raw.correlatedAlerts?.length || 1,
    supportingRuleIds: Array.isArray(raw.supportingRuleIds) ? raw.supportingRuleIds : [],
    supportingEventIds: Array.isArray(raw.supportingEventIds) ? raw.supportingEventIds : [],
    evidenceSummary: Array.isArray(raw.evidenceSummary) ? raw.evidenceSummary : [],
    recommendedInvestigationSteps: Array.isArray(raw.recommendedInvestigationSteps)
      ? raw.recommendedInvestigationSteps
      : [],
    falsePositiveConsiderations: Array.isArray(raw.falsePositiveConsiderations)
      ? raw.falsePositiveConsiderations
      : [],
    analysisSource: text(raw.analysisSource) || 'heuristic',
    modelUsed: text(raw.modelUsed) || null,
    analyzedAt: text(raw.analyzedAt) || null,
    correlatedAlerts: Array.isArray(raw.correlatedAlerts) ? raw.correlatedAlerts : [],
    raw: raw.raw && typeof raw.raw === 'object' ? raw.raw : raw,
  }
}

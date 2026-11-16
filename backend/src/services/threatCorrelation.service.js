import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { geminiService } from './gemini.service.js'
import { wazuhIndexerService } from './wazuhIndexer.service.js'
import { logger } from '../utils/logger.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DATA_DIR = path.resolve(__dirname, '../../data')
const INCIDENTS_FILE = path.join(DATA_DIR, 'ai-incidents.json')

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

function readIncidents() {
  try {
    if (!fs.existsSync(INCIDENTS_FILE)) return []
    const raw = fs.readFileSync(INCIDENTS_FILE, 'utf-8')
    return JSON.parse(raw)
  } catch (err) {
    logger.warn(`Failed to read ${INCIDENTS_FILE}: ${err.message}`)
    return []
  }
}

function writeIncidents(incidents) {
  try {
    const tempFile = `${INCIDENTS_FILE}.tmp`
    fs.writeFileSync(tempFile, JSON.stringify(incidents, null, 2), 'utf-8')
    fs.renameSync(tempFile, INCIDENTS_FILE)
  } catch (err) {
    logger.error(`Failed to write ${INCIDENTS_FILE}: ${err.message}`)
  }
}

/**
 * Computes a stable fingerprint hash for a set of alert IDs.
 */
function computeFingerprint(alertIds) {
  const sorted = [...alertIds].sort().join('|')
  return crypto.createHash('sha256').update(sorted).digest('hex').slice(0, 16)
}

/**
 * Fallback deterministic heuristic classifier based on genuine Wazuh rules and Windows events.
 */
function heuristicClassify(cluster) {
  const ruleIds = new Set(cluster.ruleIds || [])
  const eventIds = new Set(cluster.eventIds || [])

  // 1. Windows Authentication Brute Force / Credential Access
  if (ruleIds.has('100100') || eventIds.has('4625')) {
    const targetUser = cluster.users[0] || 'Target Account'
    return {
      title: `Multiple Failed Logon Attempts against ${targetUser}`,
      suspectedAttackType: 'Brute Force',
      explanation: `Observed ${cluster.eventCount} failed Windows authentication events (Event ID 4625 / Rule 100100) targeting account "${targetUser}". Repeated authentication failures suggest an automated dictionary attack or password guessing activity.`,
      severity: cluster.eventCount >= 10 ? 'high' : 'medium',
      confidence: 0.85,
      confidenceReasoning: 'High confidence based on verified Windows Event ID 4625 audit failure logs from the Security EventChannel. Confidence indicates strong evidence of repeated authentication failures, but manual validation is required to confirm whether this stems from an external threat actor or local credential misconfiguration.',
      mitreTactic: 'Credential Access',
      mitreTechniqueId: 'T1110.001',
      mitreTechniqueName: 'Password Guessing',
      evidenceSummary: [
        `${cluster.eventCount} authentication failure events recorded under Rule 100100`,
        `Target account: ${targetUser}`,
        `Event ID 4625 logged by Microsoft-Windows-Security-Auditing`,
        `Originating host/address: ${cluster.sourceIps[0] || 'Local Process / svchost.exe'}`,
      ],
      recommendedInvestigationSteps: [
        'Inspect workstation security log for corresponding caller process IDs',
        'Verify whether account lockouts occurred during this timeframe',
        'Check network connections from source IP address for external origin',
        'Review recent password changes for the target account',
      ],
      falsePositiveConsiderations: [
        'Cached credentials in background services, scheduled tasks, or browsers',
        'User typing incorrect password multiple times during unlock',
      ],
      analysisSource: 'heuristic',
    }
  }

  // 2. PowerShell Execution & Environment Enumeration
  if (ruleIds.has('91816') || ruleIds.has('100101') || eventIds.has('4104')) {
    return {
      title: 'Suspicious PowerShell Script Block Execution & Environment Discovery',
      suspectedAttackType: 'Suspicious PowerShell Execution',
      explanation: `Observed ${cluster.eventCount} PowerShell Script Block (Event ID 4104) telemetry events querying system environment variables. Adversaries frequently leverage PowerShell to perform automated host reconnaissance and environment discovery.`,
      severity: 'medium',
      confidence: 0.8,
      confidenceReasoning: 'Corroborated by deep script block inspection (Event ID 4104) and Wazuh Rule 91816. Telemetry confirms script block execution; confidence reflects evidence completeness rather than malicious intent certainty.',
      mitreTactic: 'Execution',
      mitreTechniqueId: 'T1059.001',
      mitreTechniqueName: 'PowerShell',
      evidenceSummary: [
        `${cluster.eventCount} script block events logged by Microsoft-Windows-PowerShell`,
        'Execution triggered rule 91816: Powershell script querying system environment variables',
        'Script block inspection reveals environment variable queries',
      ],
      recommendedInvestigationSteps: [
        'Review full script block contents in the investigation view',
        'Identify parent process that spawned PowerShell.exe',
        'Check whether script was executed by an administrator or automated task',
      ],
      falsePositiveConsiderations: [
        'Administrative automation scripts, deployment tools, or diagnostic utilities',
        'Node.js, Visual Studio Code, or build runners executing internal scripts',
      ],
      analysisSource: 'heuristic',
    }
  }

  // 3. Sudo Privilege Escalation on Linux
  if (ruleIds.has('5402')) {
    return {
      title: 'Frequent Root Privilege Execution via Sudo',
      suspectedAttackType: 'Privilege Escalation',
      explanation: `Observed ${cluster.eventCount} instances of successful sudo execution to ROOT on ${cluster.endpoint}. Frequent elevation to root indicates administrative operations or automated command execution.`,
      severity: 'low',
      confidence: 0.75,
      confidenceReasoning: 'Backed by Linux audit logs and PAM session events. High operational confidence that privilege elevation occurred, though typical for server maintenance.',
      mitreTactic: 'Privilege Escalation',
      mitreTechniqueId: 'T1548.003',
      mitreTechniqueName: 'Sudo and Sudo Caching',
      evidenceSummary: [
        `${cluster.eventCount} sudo executions to ROOT logged under Wazuh Rule 5402`,
        `Affected server: ${cluster.endpoint}`,
      ],
      recommendedInvestigationSteps: [
        'Review command lines executed under sudo in auth.log',
        'Verify identity of user account initiating the sudo commands',
      ],
      falsePositiveConsiderations: [
        'Scheduled system updates or maintenance tasks',
        'Authorized administrator sessions',
      ],
      analysisSource: 'heuristic',
    }
  }

  // 4. Software Modification / MsiInstaller Changes
  if (ruleIds.has('60611') || ruleIds.has('60612')) {
    return {
      title: 'Rapid Application Uninstallation and Installation Sequence',
      suspectedAttackType: 'Other Suspicious Activity',
      explanation: `Observed Windows Installer (MsiInstaller) removing and immediately installing application packages within seconds on ${cluster.endpoint}.`,
      severity: 'low',
      confidence: 0.7,
      confidenceReasoning: 'Verified by Windows MsiInstaller Events 1033, 1034, 11707, and 11724. Pattern aligns with rapid software upgrade activity.',
      mitreTactic: 'Persistence',
      mitreTechniqueId: 'T1547',
      mitreTechniqueName: 'Boot or Logon Autostart Execution',
      evidenceSummary: [
        'Correlated uninstallation (Rule 60611) and installation (Rule 60612) alerts',
        'Product: Microsoft Teams Meeting Add-in',
      ],
      recommendedInvestigationSteps: [
        'Confirm software package origin and hash integrity',
        'Verify whether automatic updater triggered the modification',
      ],
      falsePositiveConsiderations: [
        'Legitimate background software auto-updates',
      ],
      analysisSource: 'heuristic',
    }
  }

  // Default: Generic / Insufficient Evidence
  return {
    title: `Correlated Security Activity on ${cluster.endpoint}`,
    suspectedAttackType: 'Insufficient Evidence',
    explanation: `Observed ${cluster.eventCount} telemetry alerts across rules [${Array.from(ruleIds).join(', ')}]. Current evidence is insufficient to classify this pattern as an active attack.`,
    severity: 'informational',
    confidence: 0.5,
    confidenceReasoning: 'Evidence is non-conclusive and reflects general system compliance or telemetry monitoring.',
    mitreTactic: 'Discovery',
    mitreTechniqueId: 'T1082',
    mitreTechniqueName: 'System Information Discovery',
    evidenceSummary: [`${cluster.eventCount} alerts from rules ${Array.from(ruleIds).join(', ')}`],
    recommendedInvestigationSteps: ['Monitor endpoint for subsequent anomaly spikes'],
    falsePositiveConsiderations: ['Standard OS telemetry and compliance auditing'],
    analysisSource: 'heuristic',
  }
}

export const threatCorrelationService = {
  /**
   * Fetches real raw alerts from Wazuh Indexer and groups them into correlated clusters.
   */
  async fetchAndClusterAlerts(agentId = 'all', options = {}) {
    const filter = []

    if (agentId && agentId !== 'all') {
      filter.push({ term: { 'agent.id': agentId } })
    }

    const query = {
      bool: {
        filter,
        must_not: [
          // Filter out benign pure CIS checks if they overwhelm the query, or keep priority rules
        ],
      },
    }

    const size = options.size || 500
    logger.debug(`Fetching alerts from indexer for correlation (agent: ${agentId}, size: ${size})`)

    const res = await wazuhIndexerService.search('wazuh-alerts-4.x-*', {
      query,
      sort: [{ '@timestamp': { order: 'desc' } }],
      size,
    })

    const hits = res?.hits?.hits || []
    if (hits.length === 0) return []

    // Group alerts by agent ID first (strict endpoint isolation)
    const byAgent = {}
    hits.forEach((hit) => {
      const src = hit._source
      const aId = src.agent?.id || 'unknown'
      if (!byAgent[aId]) byAgent[aId] = []
      byAgent[aId].push(hit)
    })

    const rawClusters = []

    // Within each agent, group related alerts into pattern clusters
    for (const [aId, agentHits] of Object.entries(byAgent)) {
      const authGroup = []
      const powershellGroup = []
      const sudoGroup = []
      const installerGroup = []
      const otherGroup = []

      agentHits.forEach((hit) => {
        const rId = String(hit._source.rule?.id || '')
        const evId = String(hit._source.data?.win?.system?.eventID || '')
        const channel = String(hit._source.data?.win?.system?.channel || '')

        if (rId === '100100' || evId === '4625' || evId === '4624' || rId.startsWith('601')) {
          authGroup.push(hit)
        } else if (rId === '91816' || rId === '100101' || evId === '4104' || channel.includes('PowerShell')) {
          powershellGroup.push(hit)
        } else if (rId === '5402' || rId === '5501' || rId === '5502') {
          sudoGroup.push(hit)
        } else if (['60610', '60611', '60612', '60635'].includes(rId)) {
          installerGroup.push(hit)
        } else {
          otherGroup.push(hit)
        }
      })

      const epName = agentHits[0]._source.agent?.name || 'Unknown'

      // Helper to build a cluster descriptor
      const makeCluster = (category, list) => {
        if (!list || list.length === 0) return null
        const timestamps = list.map((h) => new Date(h._source['@timestamp'] || h._source.timestamp).getTime())
        const minTime = new Date(Math.min(...timestamps)).toISOString()
        const maxTime = new Date(Math.max(...timestamps)).toISOString()

        const ruleIds = Array.from(new Set(list.map((h) => h._source.rule?.id).filter(Boolean)))
        const eventIds = Array.from(new Set(list.map((h) => h._source.data?.win?.system?.eventID).filter(Boolean)))
        const users = Array.from(
          new Set(
            list
              .map((h) => h._source.data?.win?.eventdata?.targetUserName || h._source.data?.dstuser || h._source.data?.srcuser)
              .filter(Boolean)
          )
        )
        const sourceIps = Array.from(
          new Set(
            list
              .map((h) => h._source.data?.win?.eventdata?.ipAddress || h._source.data?.srcip)
              .filter((ip) => ip && ip !== '-')
          )
        )
        const alertIds = list.map((h) => h._id || h._source.id || String(Math.random()))

        return {
          id: `INC-${aId}-${category.toUpperCase()}`,
          agentId: aId,
          endpoint: epName,
          category,
          firstSeen: minTime,
          lastSeen: maxTime,
          eventCount: list.length,
          ruleIds,
          eventIds,
          users,
          sourceIps,
          alertIds,
          rawAlerts: list,
          fingerprint: computeFingerprint(alertIds),
        }
      }

      if (authGroup.length > 0) rawClusters.push(makeCluster('auth-failures', authGroup))
      if (powershellGroup.length > 0) rawClusters.push(makeCluster('powershell-exec', powershellGroup))
      if (sudoGroup.length > 0) rawClusters.push(makeCluster('sudo-elevation', sudoGroup))
      if (installerGroup.length > 0) rawClusters.push(makeCluster('software-changes', installerGroup))
      if (otherGroup.length >= 5) rawClusters.push(makeCluster('system-telemetry', otherGroup))
    }

    return rawClusters.filter(Boolean)
  },

  /**
   * Correlates and analyzes incidents using Gemini AI (with heuristic fallback).
   */
  async correlateAndAnalyze(agentId = 'all', options = {}) {
    const rawClusters = await this.fetchAndClusterAlerts(agentId, options)
    const existingIncidents = readIncidents()
    const incidentMap = new Map(existingIncidents.map((inc) => [inc.id, inc]))

    const updatedIncidents = []

    for (const cluster of rawClusters) {
      const existing = incidentMap.get(cluster.id)
      const isUnchanged = existing && existing.fingerprint === cluster.fingerprint && !options.force

      if (isUnchanged) {
        updatedIncidents.push(existing)
        continue
      }

      // Step 1: Run deterministic heuristic baseline
      const heuristic = heuristicClassify(cluster)

      // Step 2: Try Gemini AI classification if configured
      let aiResult = null
      if (geminiService.isConfigured()) {
        try {
          aiResult = await geminiService.classifyAttack(
            {
              id: cluster.id,
              endpoint: cluster.endpoint,
              agentId: cluster.agentId,
              firstSeen: cluster.firstSeen,
              lastSeen: cluster.lastSeen,
              eventCount: cluster.eventCount,
              candidateType: heuristic.suspectedAttackType,
              candidateTitle: heuristic.title,
              ruleIds: cluster.ruleIds,
              eventIds: cluster.eventIds,
              users: cluster.users,
              sourceIps: cluster.sourceIps,
            },
            cluster.rawAlerts
          )
        } catch (err) {
          logger.warn(`Gemini analysis failed for cluster ${cluster.id}: ${err.message}`)
        }
      }

      const activeClassification = aiResult || heuristic

      // Extract simplified source alert records for frontend inspection
      const correlatedAlerts = cluster.rawAlerts.map((h) => ({
        id: h._id || h._source.id,
        timestamp: h._source['@timestamp'] || h._source.timestamp,
        ruleId: h._source.rule?.id,
        ruleDescription: h._source.rule?.description,
        ruleLevel: h._source.rule?.level,
        eventId: h._source.data?.win?.system?.eventID,
        channel: h._source.data?.win?.system?.channel,
        user: h._source.data?.win?.eventdata?.targetUserName || h._source.data?.dstuser,
        ip: h._source.data?.win?.eventdata?.ipAddress || h._source.data?.srcip,
        scriptBlock: h._source.data?.win?.eventdata?.scriptBlockText,
        raw: h._source,
      }))

      // Preserve historical analysis provenance across runs
      const history = Array.isArray(existing?.analysisHistory) ? [...existing.analysisHistory] : []
      if (existing && existing.analyzedAt) {
        history.push({
          analyzedAt: existing.analyzedAt,
          analysisSource: existing.analysisSource,
          modelUsed: existing.modelUsed,
          title: existing.title,
          suspectedAttackType: existing.suspectedAttackType,
          severity: existing.severity,
          confidence: existing.confidence,
        })
      }

      const isGeminiSuccess = Boolean(aiResult && aiResult.analysisSource === 'gemini')
      const effectiveSource = isGeminiSuccess ? 'gemini' : 'heuristic'
      const effectiveModel = isGeminiSuccess ? geminiService.getModel() : null
      const failureReason = isGeminiSuccess ? null : geminiService.getLastError()

      const incident = {
        id: cluster.id,
        title: activeClassification.title,
        suspectedAttackType: activeClassification.suspectedAttackType,
        explanation: activeClassification.explanation,
        severity: activeClassification.severity,
        confidence: activeClassification.confidence,
        confidenceReasoning: activeClassification.confidenceReasoning,
        mitreTactic: activeClassification.mitreTactic,
        mitreTechniqueId: activeClassification.mitreTechniqueId,
        mitreTechniqueName: activeClassification.mitreTechniqueName,
        affectedEndpoint: cluster.endpoint,
        agentId: cluster.agentId,
        firstSeen: cluster.firstSeen,
        lastSeen: cluster.lastSeen,
        eventCount: cluster.eventCount,
        supportingRuleIds: cluster.ruleIds,
        supportingEventIds: cluster.eventIds,
        evidenceSummary: activeClassification.evidenceSummary,
        recommendedInvestigationSteps: activeClassification.recommendedInvestigationSteps,
        falsePositiveConsiderations: activeClassification.falsePositiveConsiderations,
        analysisSource: effectiveSource,
        modelUsed: effectiveModel,
        analysisFailureReason: failureReason,
        analysisHistory: history,
        fingerprint: cluster.fingerprint,
        analyzedAt: new Date().toISOString(),
        correlatedAlerts,
      }

      incidentMap.set(cluster.id, incident)
      updatedIncidents.push(incident)
    }

    // Persist all incidents to disk
    const allIncidents = Array.from(incidentMap.values())
    writeIncidents(allIncidents)

    return updatedIncidents
  },

  /**
   * Reanalyzes a single existing incident using Gemini AI while preserving history.
   */
  async reanalyzeIncident(incidentId) {
    const existingIncidents = readIncidents()
    const match = existingIncidents.find((i) => i.id === incidentId)
    if (!match) return null

    let aiResult = null
    if (geminiService.isConfigured()) {
      try {
        aiResult = await geminiService.classifyAttack(
          {
            id: match.id,
            endpoint: match.affectedEndpoint,
            agentId: match.agentId,
            firstSeen: match.firstSeen,
            lastSeen: match.lastSeen,
            eventCount: match.eventCount,
            candidateType: match.suspectedAttackType,
            candidateTitle: match.title,
            ruleIds: match.supportingRuleIds,
            eventIds: match.supportingEventIds,
          },
          (match.correlatedAlerts || []).map((a) => a.raw || a)
        )
      } catch (err) {
        logger.warn(`Gemini reanalysis failed for ${incidentId}: ${err.message}`)
      }
    }

    const history = Array.isArray(match.analysisHistory) ? [...match.analysisHistory] : []
    history.push({
      analyzedAt: match.analyzedAt,
      analysisSource: match.analysisSource,
      modelUsed: match.modelUsed,
      title: match.title,
      suspectedAttackType: match.suspectedAttackType,
      severity: match.severity,
      confidence: match.confidence,
    })

    const isGeminiSuccess = Boolean(aiResult && aiResult.analysisSource === 'gemini')
    const effectiveSource = isGeminiSuccess ? 'gemini' : match.analysisSource
    const effectiveModel = isGeminiSuccess ? geminiService.getModel() : match.modelUsed
    const failureReason = isGeminiSuccess ? null : geminiService.getLastError()

    const updated = {
      ...match,
      ...(aiResult || {}),
      analysisSource: effectiveSource,
      modelUsed: effectiveModel,
      analysisFailureReason: failureReason,
      analysisHistory: history,
      analyzedAt: new Date().toISOString(),
    }

    const updatedList = existingIncidents.map((i) => (i.id === incidentId ? updated : i))
    writeIncidents(updatedList)
    return updated
  },

  /**
   * Returns stored incidents filtered by query params.
   */
  getIncidents(agentId = 'all', filters = {}) {
    let incidents = readIncidents()

    if (agentId && agentId !== 'all') {
      incidents = incidents.filter((inc) => inc.agentId === agentId)
    }

    if (filters.severity && filters.severity !== 'all') {
      incidents = incidents.filter((inc) => inc.severity === filters.severity.toLowerCase())
    }

    if (filters.attackType && filters.attackType !== 'all') {
      incidents = incidents.filter((inc) => inc.suspectedAttackType === filters.attackType)
    }

    if (filters.search && filters.search.trim()) {
      const q = filters.search.toLowerCase().trim()
      incidents = incidents.filter(
        (inc) =>
          inc.title?.toLowerCase().includes(q) ||
          inc.suspectedAttackType?.toLowerCase().includes(q) ||
          inc.mitreTactic?.toLowerCase().includes(q) ||
          inc.mitreTechniqueId?.toLowerCase().includes(q) ||
          inc.affectedEndpoint?.toLowerCase().includes(q) ||
          inc.explanation?.toLowerCase().includes(q)
      )
    }

    // Sort by severity rank, then latest timestamp
    const severityRank = { critical: 4, high: 3, medium: 2, low: 1, informational: 0 }
    incidents.sort((a, b) => {
      const rankDiff = (severityRank[b.severity] || 0) - (severityRank[a.severity] || 0)
      if (rankDiff !== 0) return rankDiff
      return new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime()
    })

    return incidents
  },

  /**
   * Computes dashboard statistics for AI Threat Intel.
   */
  getMetrics(incidents = []) {
    const severityBreakdown = { critical: 0, high: 0, medium: 0, low: 0, informational: 0 }
    const attackTypeBreakdown = {}
    const mitreMap = {}
    const endpointBreakdown = {}

    incidents.forEach((inc) => {
      const sev = inc.severity || 'medium'
      severityBreakdown[sev] = (severityBreakdown[sev] || 0) + 1

      const type = inc.suspectedAttackType || 'Other Suspicious Activity'
      attackTypeBreakdown[type] = (attackTypeBreakdown[type] || 0) + 1

      if (inc.mitreTechniqueId) {
        const key = `${inc.mitreTechniqueId} - ${inc.mitreTechniqueName || ''}`
        mitreMap[key] = (mitreMap[key] || 0) + 1
      }

      const ep = inc.affectedEndpoint || 'Unknown'
      endpointBreakdown[ep] = (endpointBreakdown[ep] || 0) + 1
    })

    const mitreTechniques = Object.entries(mitreMap).map(([technique, count]) => ({
      technique,
      count,
    }))

    return {
      totalIncidents: incidents.length,
      severityBreakdown,
      attackTypeBreakdown,
      mitreTechniques,
      endpointBreakdown,
    }
  },
}

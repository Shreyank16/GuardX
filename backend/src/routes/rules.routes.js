import { Router } from 'express'
import { wazuhApiService } from '../services/wazuhApi.service.js'
import { wazuhIndexerService } from '../services/wazuhIndexer.service.js'
import { logger } from '../utils/logger.js'

export const rulesRouter = Router()

/**
 * Severity mapping helper based on Wazuh rule level:
 * - Level >= 15: Critical
 * - Level 12-14: High
 * - Level 7-11: Medium
 * - Level 4-6: Low
 * - Level 0-3: Informational
 */
function severityFromLevel(level) {
  const val = Number(level)
  if (Number.isNaN(val)) return 'informational'
  if (val >= 15) return 'critical'
  if (val >= 12) return 'high'
  if (val >= 7) return 'medium'
  if (val >= 4) return 'low'
  return 'informational'
}

/**
 * Maps requested severity filter to Wazuh Manager API rule level range:
 */
const SEVERITY_LEVEL_MAP = {
  critical: '15-16',
  high: '12-14',
  medium: '7-11',
  low: '4-6',
  informational: '0-3',
}

/**
 * GET /api/rules
 * Queries configured Wazuh detection rules from Wazuh Manager API (port 55000),
 * enriched with live alert counts and recent alert activity from the Wazuh Indexer (port 9200).
 *
 * Query Parameters:
 * - search: free-text keyword search across rule descriptions and names
 * - severity: 'critical' | 'high' | 'medium' | 'low' | 'informational' | 'all'
 * - level: specific level (e.g. '10') or range (e.g. '10-15')
 * - group: rule group (e.g. 'windows', 'syscheck', 'authentication')
 * - ruleId / rule_id: specific rule ID or comma-separated rule IDs
 * - limit: number of rules to return (default: 500, max: 1000)
 * - offset: pagination offset (default: 0)
 * - hasAlerts / activeOnly: 'true' | 'false' (filter rules with/without alert records)
 */
rulesRouter.get('/rules', async (req, res, next) => {
  try {
    const {
      search,
      severity,
      level,
      group,
      ruleId,
      rule_id,
      agent,
      agentId,
      limit = '500',
      offset = '0',
      hasAlerts,
      activeOnly,
    } = req.query

    const parsedLimit = Math.min(Math.max(Number.parseInt(limit, 10) || 500, 1), 1000)
    const parsedOffset = Math.max(Number.parseInt(offset, 10) || 0, 0)

    // Build Manager API query parameters
    const managerParams = {
      limit: parsedLimit,
      offset: parsedOffset,
    }

    if (search && typeof search === 'string' && search.trim()) {
      managerParams.search = search.trim()
    }

    // Level / Severity filter
    if (level && typeof level === 'string' && level.trim() && level.toLowerCase() !== 'all') {
      managerParams.level = level.trim()
    } else if (severity && typeof severity === 'string' && severity.trim() && severity.toLowerCase() !== 'all') {
      const mappedLevel = SEVERITY_LEVEL_MAP[severity.trim().toLowerCase()]
      if (mappedLevel) {
        managerParams.level = mappedLevel
      }
    }

    // Group filter
    if (group && typeof group === 'string' && group.trim() && group.toLowerCase() !== 'all') {
      managerParams.group = group.trim()
    }

    // Rule ID filter
    const targetRuleId = (ruleId || rule_id || '').toString().trim()
    if (targetRuleId && targetRuleId.toLowerCase() !== 'all') {
      managerParams.rule_ids = targetRuleId
    }

    logger.debug(`Querying Wazuh detection rules and activity (params: ${JSON.stringify(managerParams)})`)

    // Query Indexer for alert activity across all historical records (optionally isolated by agent)
    const indexerQuery = {
      size: 0,
      aggs: {
        active_rules: {
          terms: { field: 'rule.id', size: 1000 },
          aggs: {
            last_alert: { max: { field: '@timestamp' } },
          },
        },
      },
    }

    const targetAgent = (agentId || agent || '').toString().trim()
    if (targetAgent && targetAgent.toLowerCase() !== 'all') {
      indexerQuery.query = {
        bool: {
          filter: [
            {
              bool: {
                should: [
                  { term: { 'agent.id': targetAgent } },
                  { term: { 'agent.name': targetAgent } },
                  { match_phrase: { 'agent.name': targetAgent } },
                ],
                minimum_should_match: 1,
              },
            },
          ],
        },
      }
    }

    const indexerResponse = await wazuhIndexerService
      .search('wazuh-alerts-4.x-*', indexerQuery)
      .catch((err) => {
        logger.warn(`Could not retrieve rule alert activity from Indexer: ${err.message}`)
        return null
      })

    // Build alert activity map from Indexer aggregations
    const activityMap = new Map()
    const activeBuckets = indexerResponse?.aggregations?.active_rules?.buckets || []
    let totalAlertsInIndexer = 0
    const activeRuleIds = []

    for (const b of activeBuckets) {
      const count = b.doc_count || 0
      totalAlertsInIndexer += count
      const keyStr = String(b.key)
      activeRuleIds.push(keyStr)
      activityMap.set(keyStr, {
        count,
        lastAlert: b.last_alert?.value_as_string || null,
      })
    }

    let rawRules = []
    let totalConfigured = 0

    const filterHasAlerts = hasAlerts ?? activeOnly
    const wantOnlyActive = filterHasAlerts === 'true' || filterHasAlerts === true || filterHasAlerts === '1'

    if (wantOnlyActive) {
      // Query Manager API specifically for rules that have alerts
      const activeIdsSlice = activeRuleIds.slice(parsedOffset, parsedOffset + parsedLimit)
      if (activeIdsSlice.length > 0) {
        const mgrRes = await wazuhApiService.getRules({
          ...managerParams,
          rule_ids: activeIdsSlice.join(','),
          limit: activeIdsSlice.length,
          offset: 0,
        })
        rawRules = mgrRes?.data?.affected_items || []
        totalConfigured = activeRuleIds.length
      } else {
        rawRules = []
        totalConfigured = activeRuleIds.length
      }
    } else if (!search && !severity && !level && !group && !targetRuleId && parsedOffset === 0) {
      // General catalog load without specific filters: ensure active rules are included alongside base rules
      const [activeRes, baseRes] = await Promise.all([
        wazuhApiService.getRules({ rule_ids: activeRuleIds.join(','), limit: 100 }).catch(() => null),
        wazuhApiService.getRules(managerParams),
      ])

      const ruleMap = new Map()
      if (activeRes?.data?.affected_items) {
        for (const r of activeRes.data.affected_items) {
          ruleMap.set(String(r.id), r)
        }
      }
      if (baseRes?.data?.affected_items) {
        for (const r of baseRes.data.affected_items) {
          if (!ruleMap.has(String(r.id))) {
            ruleMap.set(String(r.id), r)
          }
        }
      }
      rawRules = Array.from(ruleMap.values())
      totalConfigured = baseRes?.data?.total_affected_items ?? rawRules.length
    } else {
      // Specific filter or pagination request
      const mgrRes = await wazuhApiService.getRules(managerParams)
      rawRules = mgrRes?.data?.affected_items || []
      totalConfigured = mgrRes?.data?.total_affected_items ?? rawRules.length
    }

    // Map and enrich rules
    const affected_items = rawRules.map((rule) => {
      const ruleIdStr = String(rule.id)
      const activity = activityMap.get(ruleIdStr)
      const alertCount = activity?.count || 0
      const lastAlert = activity?.lastAlert || null
      const hasAlertRecord = alertCount > 0
      const ruleLevel = Number(rule.level ?? 0)
      const ruleSeverity = severityFromLevel(ruleLevel)
      const eventId =
        rule.details?.['win.system.eventID']?.pattern?.replace(/[\^$]/g, '') ||
        rule.details?.event_id ||
        null
      const parentRule = rule.details?.if_sid || null

      return {
        id: ruleIdStr,
        level: ruleLevel,
        severity: ruleSeverity,
        name: rule.description || `Rule ${ruleIdStr}`,
        description: rule.description || '',
        groups: Array.isArray(rule.groups) ? rule.groups : [],
        group: Array.isArray(rule.groups) && rule.groups.length ? rule.groups[0] : 'ungrouped',
        filename: rule.filename || null,
        relative_dirname: rule.relative_dirname || null,
        status: rule.status || 'enabled',
        details: rule.details || {},
        mitre: Array.isArray(rule.mitre) ? rule.mitre : [],
        pci_dss: Array.isArray(rule.pci_dss) ? rule.pci_dss : [],
        gdpr: Array.isArray(rule.gdpr) ? rule.gdpr : [],
        hipaa: Array.isArray(rule.hipaa) ? rule.hipaa : [],
        nist_800_53: Array.isArray(rule.nist_800_53) ? rule.nist_800_53 : [],
        tsc: Array.isArray(rule.tsc) ? rule.tsc : [],
        gpg13: Array.isArray(rule.gpg13) ? rule.gpg13 : [],
        eventId,
        parentRule,
        alertCount,
        lastAlert,
        hasAlerts: hasAlertRecord,
        liveAlertsVerified: hasAlertRecord,
        verification: hasAlertRecord
          ? 'Live alert verified'
          : 'Configured (No alerts recorded)',
        verificationNote: hasAlertRecord
          ? `Rule verified active with ${alertCount} alert${alertCount > 1 ? 's' : ''} in Wazuh Indexer.`
          : `Configured on Wazuh Manager (${rule.status || 'enabled'}). No matching alerts recorded in current index.`,
        raw: rule,
      }
    })

    // Sort: rules with alert activity first (highest alert count first)
    affected_items.sort((a, b) => b.alertCount - a.alertCount)

    // Compute severity counts across the returned set
    const severityCounts = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      informational: 0,
    }
    for (const r of affected_items) {
      if (Object.hasOwn(severityCounts, r.severity)) {
        severityCounts[r.severity] += 1
      }
    }

    const metrics = {
      totalConfigured,
      returnedRules: affected_items.length,
      activeRulesWithAlerts: activeBuckets.length,
      totalAlerts: totalAlertsInIndexer,
      severityCounts,
    }

    return res.json({
      affected_items,
      total_affected_items: totalConfigured,
      metrics,
      offset: parsedOffset,
      limit: parsedLimit,
    })
  } catch (err) {
    logger.error(`Error querying Wazuh rules: ${err.message}`)
    return next(err)
  }
})

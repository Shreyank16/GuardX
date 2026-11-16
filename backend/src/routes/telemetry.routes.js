import { Router } from 'express'
import { wazuhIndexerService } from '../services/wazuhIndexer.service.js'
import { logger } from '../utils/logger.js'
import { buildTimeRangeFilter } from '../utils/timeRange.js'

export const telemetryRouter = Router()

/**
 * Action mapping helper from Wazuh syscheck.event to GuardX standard actions:
 * - 'added' | 'created' -> 'created'
 * - 'modified' -> 'modified'
 * - 'deleted' -> 'deleted'
 */
function mapAction(event) {
  if (!event) return 'modified'
  const ev = String(event).toLowerCase().trim()
  if (ev === 'added' || ev === 'created') return 'created'
  if (ev === 'deleted') return 'deleted'
  if (ev === 'modified') return 'modified'
  return ev
}

/**
 * Classifies an alert target path as 'registry' (if starting with HKEY_) or 'file'.
 */
function getObjectType(path) {
  if (!path) return 'file'
  return String(path).trim().toUpperCase().startsWith('HKEY_') ? 'registry' : 'file'
}

/**
 * Maps requested filter action to matching Wazuh syscheck.event values
 */
const ACTION_FILTER_MAP = {
  created: ['added', 'created'],
  added: ['added', 'created'],
  modified: ['modified'],
  deleted: ['deleted'],
}

/**
 * Helper to extract action doc_count from an OpenSearch terms aggregation bucket
 */
function getBucketActionCount(bucket, actionKey) {
  if (!bucket || !Array.isArray(bucket.actions?.buckets)) return 0
  const match = bucket.actions.buckets.find((b) => b.key === actionKey)
  return match?.doc_count || 0
}

/**
 * GET /api/fim
 * Queries File Integrity Monitoring (Syscheck) alerts from the Wazuh Indexer (OpenSearch).
 *
 * Query Parameters:
 * - range: '15m' | '1h' | '6h' | '24h' | '7d' | '30d' | 'all' (default: '24h')
 * - limit: number of events to return (default: 100, max: 1000)
 * - offset: starting index for pagination (default: 0)
 * - agent: optional agent name or ID filter
 * - action: 'created' | 'modified' | 'deleted' | 'all'
 * - objectType: 'file' | 'registry' | 'all'
 * - search: optional free-text search across file paths, usernames, checksums, descriptions
 */
telemetryRouter.get('/fim', async (req, res, next) => {
  try {
    const {
      range = '24h',
      limit = '100',
      offset = '0',
      agent,
      agentId,
      action,
      objectType,
      search,
    } = req.query

    // Sanitize pagination limits
    const parsedLimit = Math.min(Math.max(Number.parseInt(limit, 10) || 100, 1), 1000)
    const parsedOffset = Math.max(Number.parseInt(offset, 10) || 0, 0)

    // Base filter: ensure alert belongs to syscheck / FIM telemetry
    const filterClauses = [
      {
        bool: {
          should: [
            { match: { 'rule.groups': 'syscheck' } },
            { exists: { field: 'syscheck.path' } },
          ],
          minimum_should_match: 1,
        },
      },
    ]

    // Time-range filter
    const timeClause = buildTimeRangeFilter(range)
    if (timeClause) {
      filterClauses.push(timeClause)
    }

    // Action filter (created / modified / deleted)
    if (action && typeof action === 'string' && action.trim() && action.toLowerCase() !== 'all') {
      const normalizedAction = action.trim().toLowerCase()
      const matchingEvents = ACTION_FILTER_MAP[normalizedAction] || [normalizedAction]
      filterClauses.push({
        terms: {
          'syscheck.event': matchingEvents,
        },
      })
    }

    // Object type filter (file / registry)
    if (objectType && typeof objectType === 'string' && objectType.trim() && objectType.toLowerCase() !== 'all') {
      const normalizedType = objectType.trim().toLowerCase()
      if (normalizedType === 'registry') {
        filterClauses.push({ prefix: { 'syscheck.path': 'HKEY_' } })
      } else if (normalizedType === 'file') {
        filterClauses.push({ bool: { must_not: { prefix: { 'syscheck.path': 'HKEY_' } } } })
      }
    }

    // Agent filter (name or ID)
    const targetAgent = (agentId || agent || '').toString().trim()
    if (targetAgent && targetAgent.toLowerCase() !== 'all') {
      filterClauses.push({
        bool: {
          should: [
            { term: { 'agent.id': targetAgent } },
            { term: { 'agent.name': targetAgent } },
            { match_phrase: { 'agent.name': targetAgent } },
          ],
          minimum_should_match: 1,
        },
      })
    }

    const mustClauses = []

    // Search query: supports both full-text multi_match and case-insensitive wildcard for keyword fields (path, user, hash)
    if (search && typeof search === 'string' && search.trim()) {
      const cleanSearch = search.trim().slice(0, 100)
      // Normalize slashes and remove raw wildcard characters to prevent malformed regex/wildcard syntax
      const normalizedForPath = cleanSearch.replace(/[*?]/g, '').replace(/[/\\]+/g, '*')
      const wildcardTerm = `*${normalizedForPath}*`
      mustClauses.push({
        bool: {
          should: [
            {
              wildcard: {
                'syscheck.path': {
                  value: wildcardTerm,
                  case_insensitive: true,
                },
              },
            },
            {
              wildcard: {
                'syscheck.uname_after': {
                  value: `*${cleanSearch.replace(/[*?]/g, '')}*`,
                  case_insensitive: true,
                },
              },
            },
            {
              wildcard: {
                'syscheck.uname': {
                  value: `*${cleanSearch.replace(/[*?]/g, '')}*`,
                  case_insensitive: true,
                },
              },
            },
            {
              wildcard: {
                'syscheck.sha256_after': {
                  value: `*${cleanSearch.replace(/[*?]/g, '')}*`,
                  case_insensitive: true,
                },
              },
            },
            {
              multi_match: {
                query: cleanSearch,
                fields: [
                  'syscheck.path',
                  'syscheck.uname_after',
                  'syscheck.uname',
                  'agent.name',
                  'agent.id',
                  'syscheck.sha256_after',
                  'syscheck.sha256',
                  'rule.description',
                  'rule.id',
                ],
              },
            },
          ],
          minimum_should_match: 1,
        },
      })
    }

    const queryBody = {
      from: parsedOffset,
      size: parsedLimit,
      sort: [
        {
          '@timestamp': {
            order: 'desc',
            unmapped_type: 'date',
          },
        },
      ],
      query: {
        bool: {
          filter: filterClauses,
          must: mustClauses,
        },
      },
      aggs: {
        by_object_type: {
          filters: {
            filters: {
              registry: { prefix: { 'syscheck.path': 'HKEY_' } },
              file: { bool: { must_not: { prefix: { 'syscheck.path': 'HKEY_' } } } },
            },
          },
          aggs: {
            actions: { terms: { field: 'syscheck.event' } },
          },
        },
      },
    }

    logger.debug(`Querying Wazuh FIM alerts from index wazuh-alerts-4.x-* (range: ${range}, limit: ${parsedLimit})`)

    const searchResponse = await wazuhIndexerService.search('wazuh-alerts-4.x-*', queryBody)

    const rawHits = searchResponse?.hits?.hits || []
    const totalCount =
      typeof searchResponse?.hits?.total === 'number'
        ? searchResponse.hits.total
        : searchResponse?.hits?.total?.value || rawHits.length

    // Map raw OpenSearch documents into standard FIM records
    const affected_items = rawHits.map((hit) => {
      const source = hit._source || {}
      const syscheck = source.syscheck || {}
      const rawEvent = syscheck.event || ''
      const mappedAction = mapAction(rawEvent)
      const path = syscheck.path || null
      const objectType = getObjectType(path)

      // Resolve user / identity
      const user = syscheck.uname_after || syscheck.uname || syscheck.uid_after || null

      // Resolve checksum (SHA256 preferred, MD5 fallback)
      const checksum =
        syscheck.sha256_after ||
        syscheck.sha256 ||
        syscheck.sha256_before ||
        syscheck.md5_after ||
        syscheck.md5 ||
        null

      return {
        id: hit._id,
        ...source,
        objectType,
        action: mappedAction,
        path,
        user,
        checksum,
        severity: 'informational',
        ruleId: source.rule?.id || null,
        description: source.rule?.description || `${objectType === 'registry' ? 'Registry' : 'File'} event ${mappedAction}`,
        endpoint: source.agent?.name || 'Unknown',
        agentId: source.agent?.id || null,
        timestamp: source['@timestamp'],
        raw: source,
      }
    })

    // Extract aggregated metrics by objectType and action
    const fileBucket = searchResponse?.aggregations?.by_object_type?.buckets?.file || {}
    const regBucket = searchResponse?.aggregations?.by_object_type?.buckets?.registry || {}

    const metrics = {
      total: totalCount,
      file: {
        total: fileBucket.doc_count || 0,
        created: getBucketActionCount(fileBucket, 'added') + getBucketActionCount(fileBucket, 'created'),
        modified: getBucketActionCount(fileBucket, 'modified'),
        deleted: getBucketActionCount(fileBucket, 'deleted'),
      },
      registry: {
        total: regBucket.doc_count || 0,
        created: getBucketActionCount(regBucket, 'added') + getBucketActionCount(regBucket, 'created'),
        modified: getBucketActionCount(regBucket, 'modified'),
        deleted: getBucketActionCount(regBucket, 'deleted'),
      },
    }

    return res.json({
      affected_items,
      total_affected_items: totalCount,
      metrics,
      offset: parsedOffset,
      limit: parsedLimit,
    })
  } catch (err) {
    logger.error(`Error querying Wazuh FIM events: ${err.message}`)
    return next(err)
  }
})

/**
 * GET /api/authentication
 * Queries Windows Authentication telemetry (Event ID 4624 success, 4625 failure)
 * from the Wazuh Indexer (OpenSearch wazuh-alerts-4.x-*).
 *
 * Query Parameters:
 * - range: '15m' | '1h' | '6h' | '24h' | '7d' | '30d' | 'all' (default: '24h')
 * - limit: number of events to return (default: 100, max: 1000)
 * - offset: starting index for pagination (default: 0)
 * - agent: optional agent name or ID filter
 * - outcome / result: 'success' | 'failure' | 'all'
 * - search: optional free-text search across username, domain, IP, workstation, endpoint, rule
 */
telemetryRouter.get('/authentication', async (req, res, next) => {
  try {
    const {
      range = '24h',
      limit = '100',
      offset = '0',
      agent,
      agentId,
      outcome,
      result,
      search,
    } = req.query

    // Sanitize pagination limits
    const parsedLimit = Math.min(Math.max(Number.parseInt(limit, 10) || 100, 1), 1000)
    const parsedOffset = Math.max(Number.parseInt(offset, 10) || 0, 0)

    // Base filter: Windows security logon events 4624 (success) and 4625 (failure)
    const filterClauses = [
      {
        terms: {
          'data.win.system.eventID': ['4624', '4625'],
        },
      },
    ]

    // Time-range filter
    const timeClause = buildTimeRangeFilter(range)
    if (timeClause) {
      filterClauses.push(timeClause)
    }

    // Outcome / result filter (success: 4624, failure: 4625)
    const outcomeFilter = (outcome || result || '').trim().toLowerCase()
    if (outcomeFilter && outcomeFilter !== 'all') {
      if (outcomeFilter === 'success') {
        filterClauses.push({ term: { 'data.win.system.eventID': '4624' } })
      } else if (outcomeFilter === 'failure' || outcomeFilter === 'failed') {
        filterClauses.push({ term: { 'data.win.system.eventID': '4625' } })
      }
    }

    // Agent filter (name or ID)
    const targetAgent = (agentId || agent || '').toString().trim()
    if (targetAgent && targetAgent.toLowerCase() !== 'all') {
      filterClauses.push({
        bool: {
          should: [
            { term: { 'agent.id': targetAgent } },
            { term: { 'agent.name': targetAgent } },
            { match_phrase: { 'agent.name': targetAgent } },
          ],
          minimum_should_match: 1,
        },
      })
    }

    const mustClauses = []

    // Search query: supports username, domain, IP, workstation, event ID, rule ID
    if (search && typeof search === 'string' && search.trim()) {
      const cleanSearch = search.trim().slice(0, 100)
      const wildcardTerm = `*${cleanSearch.replace(/[*?]/g, '')}*`
      mustClauses.push({
        bool: {
          should: [
            {
              wildcard: {
                'data.win.eventdata.targetUserName': {
                  value: wildcardTerm,
                  case_insensitive: true,
                },
              },
            },
            {
              wildcard: {
                'data.win.eventdata.targetDomainName': {
                  value: wildcardTerm,
                  case_insensitive: true,
                },
              },
            },
            {
              wildcard: {
                'data.win.eventdata.ipAddress': {
                  value: wildcardTerm,
                  case_insensitive: true,
                },
              },
            },
            {
              wildcard: {
                'data.win.eventdata.workstationName': {
                  value: wildcardTerm,
                  case_insensitive: true,
                },
              },
            },
            {
              wildcard: {
                'data.win.system.eventID': {
                  value: wildcardTerm,
                  case_insensitive: true,
                },
              },
            },
            {
              wildcard: {
                'rule.id': {
                  value: wildcardTerm,
                  case_insensitive: true,
                },
              },
            },
            {
              multi_match: {
                query: cleanSearch,
                fields: [
                  'rule.description',
                  'agent.name',
                  'agent.id',
                  'data.win.eventdata.targetUserName',
                  'data.win.eventdata.ipAddress',
                ],
              },
            },
          ],
          minimum_should_match: 1,
        },
      })
    }

    const queryBody = {
      from: parsedOffset,
      size: parsedLimit,
      sort: [
        {
          '@timestamp': {
            order: 'desc',
            unmapped_type: 'date',
          },
        },
      ],
      query: {
        bool: {
          filter: filterClauses,
          must: mustClauses,
        },
      },
      aggs: {
        by_event_id: {
          terms: { field: 'data.win.system.eventID' },
        },
      },
    }

    logger.debug(`Querying Wazuh Authentication events from index wazuh-alerts-4.x-* (range: ${range}, limit: ${parsedLimit})`)

    const searchResponse = await wazuhIndexerService.search('wazuh-alerts-4.x-*', queryBody)

    const rawHits = searchResponse?.hits?.hits || []
    const totalCount =
      typeof searchResponse?.hits?.total === 'number'
        ? searchResponse.hits.total
        : searchResponse?.hits?.total?.value || rawHits.length

    // Map raw OpenSearch documents into standard Authentication records
    const affected_items = rawHits.map((hit) => {
      const source = hit._source || {}
      const winSystem = source.data?.win?.system || {}
      const winEventData = source.data?.win?.eventdata || {}

      const eventId = String(winSystem.eventID || '').trim()
      // Outcome strictly classified by Windows Security Event ID:
      // 4624 -> success, 4625 -> failure
      const outcome = eventId === '4624' ? 'success' : eventId === '4625' ? 'failure' : 'unknown'

      const username = winEventData.targetUserName || winEventData.subjectUserName || null
      const domain = winEventData.targetDomainName || winEventData.subjectDomainName || null
      const rawIp = winEventData.ipAddress
      const sourceIp = rawIp && rawIp !== '-' ? rawIp : null
      const workstation = winEventData.workstationName || null
      const logonType = winEventData.logonType != null ? Number(winEventData.logonType) : null

      return {
        id: hit._id,
        ...source,
        timestamp: source['@timestamp'],
        eventId,
        outcome,
        result: outcome, // dual compatibility for frontend normalizer and pages
        username,
        domain,
        sourceIp,
        workstation,
        logonType,
        endpoint: source.agent?.name || 'Unknown',
        agentId: source.agent?.id || null,
        ruleId: source.rule?.id || null,
        description: source.rule?.description || (outcome === 'success' ? 'Windows Logon Success' : 'Windows Logon Failure'),
        raw: source,
      }
    })

    // Extract aggregated metrics by Windows Event ID
    const eventBuckets = searchResponse?.aggregations?.by_event_id?.buckets || []
    const getCount = (id) => eventBuckets.find((b) => b.key === id)?.doc_count || 0

    const metrics = {
      total: totalCount,
      success: getCount('4624'),
      failure: getCount('4625'),
    }

    return res.json({
      affected_items,
      total_affected_items: totalCount,
      metrics,
      offset: parsedOffset,
      limit: parsedLimit,
    })
  } catch (err) {
    logger.error(`Error querying Wazuh Authentication events: ${err.message}`)
    return next(err)
  }
})

/**
 * GET /api/powershell
 * Queries Windows PowerShell Script Block Logging telemetry (Event ID 4104)
 * from the Wazuh Indexer (OpenSearch wazuh-alerts-4.x-*).
 *
 * Query Parameters:
 * - range: '15m' | '1h' | '6h' | '24h' | '7d' | '30d' | 'all' (default: '24h')
 * - limit: number of events to return (default: 100, max: 1000)
 * - offset: starting index for pagination (default: 0)
 * - agent: optional agent name or ID filter
 * - eventId: optional event ID filter (default matches 4104)
 * - classification: 'monitored' | 'rule-match' | 'all'
 * - search: optional free-text search across script code, scriptBlockId, command, host, user, rule ID
 */
telemetryRouter.get('/powershell', async (req, res, next) => {
  try {
    const {
      range = '24h',
      limit = '100',
      offset = '0',
      agent,
      agentId,
      eventId,
      classification,
      search,
    } = req.query

    // Sanitize pagination limits
    const parsedLimit = Math.min(Math.max(Number.parseInt(limit, 10) || 100, 1), 1000)
    const parsedOffset = Math.max(Number.parseInt(offset, 10) || 0, 0)

    // Base filter: Windows PowerShell operational telemetry / Event ID 4104
    const filterClauses = [
      {
        bool: {
          should: [
            { term: { 'data.win.system.eventID': '4104' } },
            { match: { 'rule.groups': 'powershell' } },
            { match: { 'data.win.system.channel': 'Microsoft-Windows-PowerShell/Operational' } },
          ],
          minimum_should_match: 1,
        },
      },
    ]

    // Time-range filter
    const timeClause = buildTimeRangeFilter(range)
    if (timeClause) {
      filterClauses.push(timeClause)
    }

    // Specific event ID filter
    if (eventId && typeof eventId === 'string' && eventId.trim() && eventId.toLowerCase() !== 'all') {
      filterClauses.push({ term: { 'data.win.system.eventID': eventId.trim() } })
    }

    // Classification filter (monitored vs rule-match)
    const normClass = (classification || '').trim().toLowerCase()
    if (normClass && normClass !== 'all') {
      if (normClass === 'rule-match' || normClass === 'rule_match') {
        filterClauses.push({ exists: { field: 'rule.id' } })
      } else if (normClass === 'monitored') {
        filterClauses.push({ bool: { must_not: { exists: { field: 'rule.id' } } } })
      }
    }

    // Agent filter (name or ID)
    const targetAgent = (agentId || agent || '').toString().trim()
    if (targetAgent && targetAgent.toLowerCase() !== 'all') {
      filterClauses.push({
        bool: {
          should: [
            { term: { 'agent.id': targetAgent } },
            { term: { 'agent.name': targetAgent } },
            { match_phrase: { 'agent.name': targetAgent } },
          ],
          minimum_should_match: 1,
        },
      })
    }

    const mustClauses = []

    // Search query: keyword wildcard on scriptBlockText, scriptBlockId, path, rule.id, computer, eventID; multi_match on rule.description, agent
    if (search && typeof search === 'string' && search.trim()) {
      const cleanSearch = search.trim().slice(0, 100)
      const cleanWildcard = `*${cleanSearch.replace(/[*?]/g, '')}*`
      mustClauses.push({
        bool: {
          should: [
            {
              wildcard: {
                'data.win.eventdata.scriptBlockText': {
                  value: cleanWildcard,
                  case_insensitive: true,
                },
              },
            },
            {
              wildcard: {
                'data.win.eventdata.scriptBlockId': {
                  value: cleanWildcard,
                  case_insensitive: true,
                },
              },
            },
            {
              wildcard: {
                'data.win.eventdata.path': {
                  value: cleanWildcard,
                  case_insensitive: true,
                },
              },
            },
            {
              wildcard: {
                'rule.id': {
                  value: cleanWildcard,
                  case_insensitive: true,
                },
              },
            },
            {
              wildcard: {
                'data.win.system.computer': {
                  value: cleanWildcard,
                  case_insensitive: true,
                },
              },
            },
            {
              wildcard: {
                'data.win.system.eventID': {
                  value: cleanWildcard,
                  case_insensitive: true,
                },
              },
            },
            {
              multi_match: {
                query: cleanSearch,
                fields: [
                  'rule.description',
                  'agent.name',
                  'agent.id',
                  'data.win.eventdata.commandName',
                ],
              },
            },
          ],
          minimum_should_match: 1,
        },
      })
    }

    const queryBody = {
      from: parsedOffset,
      size: parsedLimit,
      sort: [
        {
          '@timestamp': {
            order: 'desc',
            unmapped_type: 'date',
          },
        },
      ],
      query: {
        bool: {
          filter: filterClauses,
          must: mustClauses,
        },
      },
      aggs: {
        by_event_id: {
          terms: { field: 'data.win.system.eventID', size: 10 },
        },
        by_rule: {
          terms: { field: 'rule.id', size: 20 },
        },
        classification: {
          filters: {
            filters: {
              rule_match: { exists: { field: 'rule.id' } },
              monitored: { bool: { must_not: { exists: { field: 'rule.id' } } } },
            },
          },
        },
      },
    }

    logger.debug(`Querying Wazuh PowerShell events from index wazuh-alerts-4.x-* (range: ${range}, limit: ${parsedLimit})`)

    const searchResponse = await wazuhIndexerService.search('wazuh-alerts-4.x-*', queryBody)

    const rawHits = searchResponse?.hits?.hits || []
    const totalCount =
      typeof searchResponse?.hits?.total === 'number'
        ? searchResponse.hits.total
        : searchResponse?.hits?.total?.value || rawHits.length

    // Map raw OpenSearch documents into standard PowerShell records
    const affected_items = rawHits.map((hit) => {
      const source = hit._source || {}
      const winSystem = source.data?.win?.system || {}
      const winEventData = source.data?.win?.eventdata || {}

      // Strictly map event ID from source data; do not default to 4104 if missing or different
      const eventId = winSystem.eventID != null ? String(winSystem.eventID).trim() : null
      const eventType = eventId === '4104' ? 'script_block' : eventId ? `event_${eventId}` : 'unknown'
      const scriptBlockId = winEventData.scriptBlockId || null
      const scriptBlock = winEventData.scriptBlockText || null
      const scriptText = scriptBlock
      const command = winEventData.commandName || null
      const user = winEventData.userId || winSystem.computer || null
      const host = winEventData.hostName || winSystem.computer || null
      const processId = winSystem.processID || null
      const path = winEventData.path || null
      const endpoint = source.agent?.name || 'Unknown'
      const agentId = source.agent?.id || null
      const ruleId = source.rule?.id || null
      const level = source.rule?.level ?? 4
      const description = source.rule?.description || (eventId === '4104' ? 'PowerShell script block' : 'PowerShell event')
      const classification = ruleId ? 'rule-match' : 'monitored'

      return {
        id: hit._id,
        ...source,
        timestamp: source['@timestamp'],
        eventId,
        eventType,
        scriptBlockId,
        scriptBlock,
        scriptText,
        command,
        user,
        username: user,
        host,
        processId,
        path,
        endpoint,
        agentId,
        ruleId,
        level,
        classification,
        description,
        raw: source,
      }
    })

    // Extract aggregated metrics
    const classBuckets = searchResponse?.aggregations?.classification?.buckets || {}
    const ruleBuckets = searchResponse?.aggregations?.by_rule?.buckets || []

    const metrics = {
      total: totalCount,
      monitored: classBuckets.monitored?.doc_count || 0,
      ruleMatch: classBuckets.rule_match?.doc_count || 0,
      rules: ruleBuckets.map((b) => ({ ruleId: b.key, count: b.doc_count })),
    }

    return res.json({
      affected_items,
      total_affected_items: totalCount,
      metrics,
      offset: parsedOffset,
      limit: parsedLimit,
    })
  } catch (err) {
    logger.error(`Error querying Wazuh PowerShell events: ${err.message}`)
    return next(err)
  }
})

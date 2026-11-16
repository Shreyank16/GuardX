import { Router } from 'express'
import { wazuhIndexerService } from '../services/wazuhIndexer.service.js'
import { logger } from '../utils/logger.js'
import { buildSeverityFilter, buildTimeRangeFilter } from '../utils/timeRange.js'

export const alertsRouter = Router()

/**
 * GET /api/alerts
 * Queries real security alerts from the Wazuh Indexer (OpenSearch).
 *
 * Query Parameters:
 * - range: '15m' | '1h' | '6h' | '24h' | '7d' | '30d' (default: '24h')
 * - severity: 'critical' | 'high' | 'medium' | 'low' | 'informational' | 'all'
 * - limit: number of alerts to return (default: 100, max: 1000)
 * - offset: starting index for pagination (default: 0)
 * - agent: optional agent name or ID filter
 * - rule: optional rule ID filter
 * - search: optional free-text search across descriptions and usernames
 */
alertsRouter.get('/alerts', async (req, res, next) => {
  try {
    const {
      range = '24h',
      severity,
      limit = '100',
      offset = '0',
      agent,
      agentId,
      rule,
      search,
    } = req.query

    // Sanitize pagination limits
    const parsedLimit = Math.min(Math.max(Number.parseInt(limit, 10) || 100, 1), 1000)
    const parsedOffset = Math.max(Number.parseInt(offset, 10) || 0, 0)

    // Build filter clauses
    const filterClauses = []
    const timeClause = buildTimeRangeFilter(range)
    if (timeClause) {
      filterClauses.push(timeClause)
    }

    const severityClause = buildSeverityFilter(severity)
    if (severityClause) {
      filterClauses.push(severityClause)
    }

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

    if (rule && typeof rule === 'string' && rule.trim()) {
      filterClauses.push({
        term: { 'rule.id': rule.trim() },
      })
    }

    const mustClauses = []
    if (search && typeof search === 'string' && search.trim()) {
      const cleanSearch = search.trim().slice(0, 100) // limit search length
      mustClauses.push({
        multi_match: {
          query: cleanSearch,
          fields: [
            'rule.description^2',
            'agent.name',
            'agent.id',
            'data.win.eventdata.targetUserName',
            'rule.id',
          ],
        },
      })
    }

    // Construct the OpenSearch query payload
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
    }

    logger.debug(`Querying Wazuh alerts from index wazuh-alerts-4.x-* (range: ${range}, limit: ${parsedLimit})`)

    const searchResponse = await wazuhIndexerService.search('wazuh-alerts-4.x-*', queryBody)

    const rawHits = searchResponse?.hits?.hits || []
    const totalCount =
      typeof searchResponse?.hits?.total === 'number'
        ? searchResponse.hits.total
        : searchResponse?.hits?.total?.value || rawHits.length

    // Map raw OpenSearch documents into the format expected by the frontend normalizer
    const affected_items = rawHits.map((hit) => {
      const source = hit._source || {}
      return {
        id: hit._id,
        ...source,
        // Deterministic triage status: fresh Wazuh alerts default to 'open'
        status: 'open',
        // Preserve raw document for JsonViewer modal
        raw: source,
      }
    })

    return res.json({
      affected_items,
      total_affected_items: totalCount,
      offset: parsedOffset,
      limit: parsedLimit,
    })
  } catch (err) {
    logger.error(`Error querying Wazuh alerts: ${err.message}`)
    return next(err)
  }
})

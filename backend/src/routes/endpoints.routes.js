import { Router } from 'express'
import { wazuhApiService } from '../services/wazuhApi.service.js'
import { logger } from '../utils/logger.js'

export const endpointsRouter = Router()

/**
 * Maps Wazuh agent status to GuardX frontend status:
 * - 'active' -> 'online'
 * - 'disconnected' -> 'offline'
 * - 'never_connected' | 'pending' -> 'unverified'
 */
function mapAgentStatus(wazuhStatus) {
  const s = String(wazuhStatus || '').toLowerCase().trim()
  if (s === 'active') return 'online'
  if (s === 'disconnected') return 'offline'
  if (s === 'never_connected' || s === 'pending') return 'unverified'
  return 'unverified'
}

/**
 * GET /api/endpoints
 * Queries registered agents from the Wazuh Manager REST API (Port 55000).
 *
 * Query Parameters:
 * - limit: number of agents to return (default: 100)
 * - offset: starting index (default: 0)
 * - search: optional search filter
 * - status: optional status filter ('all' | 'online' | 'offline' | 'unverified' | 'active' | etc.)
 */
endpointsRouter.get('/endpoints', async (req, res, next) => {
  try {
    const { limit = '100', offset = '0', search, status, agentId, id } = req.query

    const parsedLimit = Math.min(Math.max(Number.parseInt(limit, 10) || 100, 1), 500)
    const parsedOffset = Math.max(Number.parseInt(offset, 10) || 0, 0)

    const params = {
      limit: parsedLimit,
      offset: parsedOffset,
    }

    const targetAgentId = (agentId || id || '').toString().trim()
    if (targetAgentId && targetAgentId.toLowerCase() !== 'all') {
      params.agents_list = targetAgentId
    }

    if (search && typeof search === 'string' && search.trim()) {
      params.search = search.trim().slice(0, 50)
    }

    if (status && typeof status === 'string' && status !== 'all') {
      const cleanStatus = status.trim().toLowerCase()
      // Translate frontend status to Wazuh status if needed
      if (cleanStatus === 'online') {
        params.status = 'active'
      } else if (cleanStatus === 'offline') {
        params.status = 'disconnected'
      } else if (cleanStatus === 'unverified') {
        params.status = 'never_connected'
      } else {
        params.status = cleanStatus
      }
    }

    logger.debug(`Querying Wazuh Manager agents (limit: ${parsedLimit}, offset: ${parsedOffset})`)

    const managerResponse = await wazuhApiService.getAgents(params)
    const rawItems = managerResponse?.data?.affected_items || []
    const totalCount =
      managerResponse?.data?.total_affected_items !== undefined
        ? managerResponse.data.total_affected_items
        : rawItems.length

    // Normalize and enrich each agent item for GuardX frontend
    const affected_items = rawItems.map((agent) => {
      const normalizedStatus = mapAgentStatus(agent.status)
      return {
        id: agent.id,
        agentId: agent.id,
        name: agent.name || 'Unknown',
        ip: agent.ip || agent.registerIP || 'Unknown',
        registerIP: agent.registerIP,
        status: normalizedStatus,
        wazuhStatus: agent.status,
        os: agent.os || null,
        version: agent.version,
        lastKeepAlive:
          agent.lastKeepAlive && agent.lastKeepAlive.startsWith('9999')
            ? null // Manager 000 has 9999-12-31 keepalive
            : agent.lastKeepAlive || null,
        dateAdd: agent.dateAdd,
        nodeName: agent.node_name,
        manager: agent.manager,
        groups: Array.isArray(agent.group) ? agent.group : agent.groups || [],
        raw: agent,
      }
    })

    return res.json({
      affected_items,
      total_affected_items: totalCount,
      offset: parsedOffset,
      limit: parsedLimit,
    })
  } catch (err) {
    logger.error(`Error querying Wazuh agents from Manager: ${err.message}`)
    return next(err)
  }
})

/**
 * GET /api/endpoints/:id
 * Queries a specific agent by ID from the Wazuh Manager REST API.
 */
endpointsRouter.get('/endpoints/:id', async (req, res, next) => {
  try {
    const { id } = req.params
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Agent ID required' })
    }

    const cleanId = id.trim()
    logger.debug(`Querying Wazuh Manager agent: ${cleanId}`)

    const managerResponse = await wazuhApiService.getAgent(cleanId)
    const rawItems = managerResponse?.data?.affected_items || []
    if (rawItems.length === 0) {
      return res.status(404).json({ error: `Agent with ID ${cleanId} not found` })
    }

    const agent = rawItems[0]
    const normalizedStatus = mapAgentStatus(agent.status)
    const endpoint = {
      id: agent.id,
      agentId: agent.id,
      name: agent.name || 'Unknown',
      ip: agent.ip || agent.registerIP || 'Unknown',
      registerIP: agent.registerIP,
      status: normalizedStatus,
      wazuhStatus: agent.status,
      os: agent.os || null,
      version: agent.version,
      lastKeepAlive:
        agent.lastKeepAlive && agent.lastKeepAlive.startsWith('9999')
          ? null
          : agent.lastKeepAlive || null,
      dateAdd: agent.dateAdd,
      nodeName: agent.node_name,
      manager: agent.manager,
      groups: Array.isArray(agent.group) ? agent.group : agent.groups || [],
      raw: agent,
    }

    return res.json({ data: endpoint })
  } catch (err) {
    logger.error(`Error querying Wazuh agent ${req.params.id}: ${err.message}`)
    return next(err)
  }
})

// Provide alias /api/agents and /api/agents/:id
endpointsRouter.get('/agents', (req, res, next) => {
  req.url = '/endpoints'
  endpointsRouter.handle(req, res, next)
})

endpointsRouter.get('/agents/:id', (req, res, next) => {
  req.url = `/endpoints/${req.params.id}`
  endpointsRouter.handle(req, res, next)
})

import { Router } from 'express'
import { softwareInventoryService } from '../services/softwareInventory.service.js'
import { wazuhApiService } from '../services/wazuhApi.service.js'
import { logger } from '../utils/logger.js'

export const applicationsRouter = Router()

/**
 * Natural version comparator for sorting version strings (e.g. "1.26.27102" vs "1.26.25904").
 */
function compareVersions(v1, v2) {
  const parts1 = String(v1 || '').split('.').map((n) => Number.parseInt(n, 10) || 0)
  const parts2 = String(v2 || '').split('.').map((n) => Number.parseInt(n, 10) || 0)
  const len = Math.max(parts1.length, parts2.length)
  for (let i = 0; i < len; i++) {
    const a = parts1[i] || 0
    const b = parts2[i] || 0
    if (a !== b) return a - b
  }
  return 0
}

/**
 * Normalizes a raw Wazuh Syscollector package into a standard GuardX application record.
 */
function normalizeApplicationItem(pkg, agent) {
  const name = pkg.name || 'Unknown Application'
  const publisher = pkg.vendor && pkg.vendor.trim() ? pkg.vendor.trim() : 'Unknown'
  const architecture = pkg.architecture && pkg.architecture.trim() ? pkg.architecture.trim() : 'x86_64'
  const installDate = pkg.install_time && pkg.install_time.trim() ? pkg.install_time.trim() : null
  const scanTime = pkg.scan?.time || null
  const version = pkg.version && pkg.version.trim() ? pkg.version.trim() : 'Unknown'

  return {
    id: `${pkg.agent_id || agent.id}-${pkg.format || 'pkg'}-${pkg.name}-${pkg.version || '0'}`.replace(/\s+/g, '_'),
    name,
    version,
    publisher,
    architecture,
    installDate,
    location: pkg.location && pkg.location.trim() ? pkg.location.trim() : null,
    format: pkg.format || 'win',
    endpoint: agent.name || 'Unknown',
    agentId: pkg.agent_id || agent.id,
    scanTime,
    lastObserved: scanTime || installDate,
    description: pkg.description && pkg.description.trim() ? pkg.description.trim() : null,
    size: typeof pkg.size === 'number' ? pkg.size : null,
    priority: pkg.priority && pkg.priority.trim() ? pkg.priority.trim() : null,
    section: pkg.section && pkg.section.trim() ? pkg.section.trim() : null,
    raw: pkg,
  }
}

/**
 * GET /api/applications
 * Returns installed software inventory across endpoints or for a specific isolated endpoint.
 *
 * Query Parameters:
 * - agentId: 'all' | '002' | '003' | '000' (default: 'all')
 * - search: free text search by name or publisher
 * - publisher: filter by specific publisher
 * - format: 'all' | 'win' | 'deb' | 'npm' (default: 'win' for Windows, or 'all')
 * - sort: 'name' | 'version' | 'publisher' | 'installDate' | 'endpoint' (default: 'name')
 * - order: 'asc' | 'desc' (default: 'asc')
 * - limit: number of items per page (default: 50, max: 500)
 * - offset: pagination start index (default: 0)
 */
applicationsRouter.get('/applications', async (req, res, next) => {
  try {
    const {
      agentId,
      agent,
      search,
      publisher,
      format,
      sort = 'name',
      order = 'asc',
      limit = '50',
      offset = '0',
    } = req.query

    const targetAgentId = (agentId || agent || '').toString().trim()
    const parsedLimit = Math.min(Math.max(Number.parseInt(limit, 10) || 50, 1), 500)
    const parsedOffset = Math.max(Number.parseInt(offset, 10) || 0, 0)
    const sortOrder = String(order).toLowerCase() === 'desc' ? -1 : 1

    logger.debug(`Querying Application Inventory (agentId: ${targetAgentId || 'all'}, limit: ${parsedLimit}, offset: ${parsedOffset})`)

    // 1. Retrieve registered agents to resolve target agents and their names
    const agentsRes = await wazuhApiService.getAgents({ limit: 100 })
    const allRegisteredAgents = agentsRes?.data?.affected_items || []

    let targetAgents = allRegisteredAgents.filter((a) => a.status === 'active')
    if (targetAgentId && targetAgentId.toLowerCase() !== 'all') {
      targetAgents = allRegisteredAgents.filter((a) => a.id === targetAgentId)
    }

    // 2. Fetch packages for each target agent and record diff snapshots
    const allItems = []
    const publishersMap = {}

    for (const ag of targetAgents) {
      // Determine format filter: if not explicitly provided, show 'win' for windows agents, 'all' if Linux or All
      const formatParam = format || (ag.os?.platform === 'windows' ? 'win' : undefined)
      const pkgResult = await softwareInventoryService.fetchAgentPackages(ag.id, {
        limit: 500,
        format: formatParam,
      })

      const rawPackages = pkgResult.affected_items || []

      // Run snapshot comparison and record genuine change events
      await softwareInventoryService.diffAndRecordChanges(ag.id, ag.name, rawPackages)

      // Normalize items
      rawPackages.forEach((pkg) => {
        const normalized = normalizeApplicationItem(pkg, ag)
        allItems.push(normalized)

        // Track publisher counts
        const pub = normalized.publisher
        publishersMap[pub] = (publishersMap[pub] || 0) + 1
      })
    }

    // 3. Compute dashboard metrics from actual inventory and change history
    const history = softwareInventoryService.getHistory()
    const scopedHistory =
      targetAgentId && targetAgentId.toLowerCase() !== 'all'
        ? history.filter((h) => h.agentId === targetAgentId)
        : history

    const newlyDetectedCount = scopedHistory.filter((h) => h.changeType === 'Newly detected').length
    const versionChangedCount = scopedHistory.filter((h) => h.changeType === 'Version changed').length
    const removalConfirmedCount = scopedHistory.filter((h) => h.changeType === 'Removal confirmed').length
    const missingFromLatestCount = scopedHistory.filter((h) => h.changeType === 'Missing from latest inventory').length
    const totalRemovedCount = removalConfirmedCount + missingFromLatestCount

    // 4. Apply search filter
    let filtered = allItems
    if (search && typeof search === 'string' && search.trim()) {
      const q = search.trim().toLowerCase()
      filtered = filtered.filter(
        (app) =>
          app.name.toLowerCase().includes(q) ||
          app.publisher.toLowerCase().includes(q) ||
          app.version.toLowerCase().includes(q) ||
          app.endpoint.toLowerCase().includes(q) ||
          app.architecture.toLowerCase().includes(q)
      )
    }

    // 5. Apply publisher filter
    if (publisher && typeof publisher === 'string' && publisher !== 'all') {
      const pubLower = publisher.trim().toLowerCase()
      filtered = filtered.filter((app) => app.publisher.toLowerCase() === pubLower)
    }

    // 6. Sort results
    filtered.sort((a, b) => {
      if (sort === 'version') {
        return compareVersions(a.version, b.version) * sortOrder
      }
      if (sort === 'installDate') {
        const da = a.installDate ? new Date(a.installDate).getTime() : 0
        const db = b.installDate ? new Date(b.installDate).getTime() : 0
        return (da - db) * sortOrder
      }
      if (sort === 'publisher') {
        return a.publisher.localeCompare(b.publisher) * sortOrder
      }
      if (sort === 'endpoint') {
        return a.endpoint.localeCompare(b.endpoint) * sortOrder
      }
      // Default: sort by name
      return a.name.localeCompare(b.name) * sortOrder
    })

    const totalCount = filtered.length
    const pagedItems = filtered.slice(parsedOffset, parsedOffset + parsedLimit)

    // Format publisher list for dropdown
    const publisherList = Object.entries(publishersMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)

    return res.json({
      affected_items: pagedItems,
      total_affected_items: totalCount,
      offset: parsedOffset,
      limit: parsedLimit,
      metrics: {
        totalInstalled: allItems.length,
        newlyDetected: newlyDetectedCount,
        removed: totalRemovedCount,
        removalConfirmed: removalConfirmedCount,
        missingFromLatest: missingFromLatestCount,
        versionChanged: versionChangedCount,
      },
      publishers: publisherList,
    })
  } catch (err) {
    logger.error(`Error querying applications: ${err.message}`)
    return next(err)
  }
})

/**
 * GET /api/applications/history
 * Returns the recorded software change history.
 *
 * Query Parameters:
 * - agentId: 'all' | '002' | '003' | etc.
 * - changeType: 'all' | 'Newly detected' | 'Version changed' | 'Removal confirmed' | 'Missing from latest inventory'
 * - search: string
 * - limit: number (default: 50)
 * - offset: number (default: 0)
 */
applicationsRouter.get('/applications/history', async (req, res, next) => {
  try {
    const { agentId, agent, changeType, search, limit = '50', offset = '0' } = req.query

    const targetAgentId = (agentId || agent || '').toString().trim()
    const parsedLimit = Math.min(Math.max(Number.parseInt(limit, 10) || 50, 1), 200)
    const parsedOffset = Math.max(Number.parseInt(offset, 10) || 0, 0)

    let history = softwareInventoryService.getHistory()

    if (targetAgentId && targetAgentId.toLowerCase() !== 'all') {
      history = history.filter((h) => h.agentId === targetAgentId)
    }

    if (changeType && typeof changeType === 'string' && changeType !== 'all') {
      const ctLower = changeType.trim().toLowerCase()
      history = history.filter((h) => (h.changeType || '').toLowerCase() === ctLower)
    }

    if (search && typeof search === 'string' && search.trim()) {
      const q = search.trim().toLowerCase()
      history = history.filter(
        (h) =>
          (h.appName || '').toLowerCase().includes(q) ||
          (h.endpoint || '').toLowerCase().includes(q) ||
          (h.details || '').toLowerCase().includes(q)
      )
    }

    const totalCount = history.length
    const pagedItems = history.slice(parsedOffset, parsedOffset + parsedLimit)

    return res.json({
      affected_items: pagedItems,
      total_affected_items: totalCount,
      offset: parsedOffset,
      limit: parsedLimit,
    })
  } catch (err) {
    logger.error(`Error querying application history: ${err.message}`)
    return next(err)
  }
})

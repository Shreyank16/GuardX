import { Router } from 'express'
import { config } from '../config/env.js'
import { wazuhApiService } from '../services/wazuhApi.service.js'
import { wazuhIndexerService } from '../services/wazuhIndexer.service.js'
import { logger } from '../utils/logger.js'

export const healthRouter = Router()

/**
 * GET /api/health
 * Probes Wazuh Manager (55000) and Wazuh Indexer (9200) connectivity.
 * Adheres strictly to the frontend normalizeHealth contract:
 * { ok, manager, indexer, dashboard, version, checkedAt, message }
 */
healthRouter.get('/health', async (req, res) => {
  const checkedAt = new Date().toISOString()
  let managerStatus = null
  let indexerStatus = null
  let managerError = null
  let indexerError = null
  let managerVersion = '4.14.7'

  // Probe Wazuh Manager (Port 55000)
  try {
    if (config.wazuh.apiPassword) {
      const statusRes = await wazuhApiService.getStatus()
      managerStatus = statusRes?.data || 'running'
      try {
        const infoRes = await wazuhApiService.getInfo()
        if (infoRes?.data?.version) {
          managerVersion = infoRes.data.version
        }
      } catch (err) {
        logger.debug(`Could not retrieve manager info: ${err.message}`)
      }
    } else {
      managerError = 'WAZUH_API_PASSWORD not configured'
    }
  } catch (err) {
    managerError = err.message || 'Connection refused or timeout'
    logger.warn(`Manager health check probe failed: ${managerError}`)
  }

  // Probe Wazuh Indexer (Port 9200)
  try {
    if (config.wazuh.indexerPassword) {
      const clusterHealth = await wazuhIndexerService.getClusterHealth()
      indexerStatus = clusterHealth?.status || 'reachable'
    } else {
      indexerError = 'WAZUH_INDEXER_PASSWORD not configured'
    }
  } catch (err) {
    indexerError = err.message || 'Connection refused or timeout'
    logger.warn(`Indexer health check probe failed: ${indexerError}`)
  }

  const isHealthy = Boolean(managerStatus && !managerError)

  const messages = []
  if (managerError) messages.push(`Manager: ${managerError}`)
  if (indexerError) messages.push(`Indexer: ${indexerError}`)
  const message = messages.length > 0 ? messages.join('; ') : 'Wazuh services operational'

  return res.json({
    ok: isHealthy,
    status: isHealthy ? 'ok' : 'degraded',
    manager: managerStatus ? { status: 'running', detail: managerStatus } : { status: 'offline', error: managerError },
    indexer: indexerStatus ? { status: indexerStatus } : { status: 'offline', error: indexerError },
    dashboard: 'https://127.0.0.1:8443',
    version: managerVersion,
    checkedAt,
    message,
  })
})

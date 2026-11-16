import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { wazuhApiService } from './wazuhApi.service.js'
import { wazuhIndexerService } from './wazuhIndexer.service.js'
import { logger } from '../utils/logger.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DATA_DIR = path.resolve(__dirname, '../../data')
const SNAPSHOTS_FILE = path.join(DATA_DIR, 'inventory-snapshots.json')
const HISTORY_FILE = path.join(DATA_DIR, 'software-history.json')

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true })
}

/**
 * Reads a JSON file safely, returning a fallback on error or missing file.
 */
function readJson(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback
    const raw = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(raw)
  } catch (err) {
    logger.warn(`Failed to read ${filePath}: ${err.message}`)
    return fallback
  }
}

/**
 * Writes JSON file atomically.
 */
function writeJson(filePath, data) {
  try {
    const tempFile = `${filePath}.tmp`
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8')
    fs.renameSync(tempFile, filePath)
  } catch (err) {
    logger.error(`Failed to write ${filePath}: ${err.message}`)
  }
}

/**
 * Generates a stable key for an application.
 */
function appKey(app) {
  const name = String(app.name || '').trim().toLowerCase()
  const arch = String(app.architecture || '').trim().toLowerCase()
  return `${name}::${arch}`
}

export const softwareInventoryService = {
  /**
   * Loads saved snapshots from disk.
   * Shape: { [agentId]: { timestamp: string, packages: Record<string, PackageItem> } }
   */
  getSnapshots() {
    return readJson(SNAPSHOTS_FILE, {})
  },

  /**
   * Saves updated snapshots to disk.
   */
  saveSnapshots(snapshots) {
    writeJson(SNAPSHOTS_FILE, snapshots)
  },

  /**
   * Loads change history from disk.
   */
  getHistory() {
    return readJson(HISTORY_FILE, [])
  },

  /**
   * Saves change history to disk.
   */
  saveHistory(history) {
    writeJson(HISTORY_FILE, history)
  },

  /**
   * Queries real Wazuh Syscollector packages for a specific agent.
   */
  async fetchAgentPackages(agentId, options = {}) {
    try {
      const params = {
        limit: options.limit || 500,
        offset: options.offset || 0,
      }
      if (options.format && options.format !== 'all') {
        params.format = options.format
      }
      if (options.search) {
        params.search = options.search
      }

      const res = await wazuhApiService.request('GET', `/syscollector/${agentId}/packages`, { params })
      return {
        affected_items: res?.data?.affected_items || [],
        total_affected_items: res?.data?.total_affected_items || 0,
      }
    } catch (err) {
      logger.warn(`Syscollector packages query failed for agent ${agentId}: ${err.message}`)
      return { affected_items: [], total_affected_items: 0 }
    }
  },

  /**
   * Queries Windows uninstallation / installation alerts from the Indexer for verification.
   */
  async queryInstallerAlerts(agentId) {
    try {
      const filter = [
        {
          bool: {
            should: [
              { term: { 'data.win.system.providerName': 'MsiInstaller' } },
              { terms: { 'rule.id': ['60610', '60611', '60612', '60635', '2902'] } },
              { wildcard: { 'rule.description': '*installed*' } },
              { wildcard: { 'rule.description': '*uninstalled*' } },
            ],
            minimum_should_match: 1,
          },
        },
      ]

      if (agentId && agentId !== 'all') {
        filter.push({ term: { 'agent.id': agentId } })
      }

      const res = await wazuhIndexerService.search('wazuh-alerts-4.x-*', {
        query: { bool: { filter } },
        sort: [{ '@timestamp': { order: 'desc' } }],
        size: 100,
      })

      return res?.hits?.hits?.map((h) => h._source) || []
    } catch (err) {
      logger.warn(`Failed to query installer alerts from indexer: ${err.message}`)
      return []
    }
  },

  /**
   * Analyzes an agent's current live scan against its previous snapshot,
   * correlating with Indexer uninstallation events to distinguish:
   * - Newly detected
   * - Version changed
   * - Removal confirmed (verified by Windows installer / uninstaller event)
   * - Missing from latest inventory (disappeared without confirmed uninstaller event)
   */
  async diffAndRecordChanges(agentId, endpointName, currentPackages) {
    const snapshots = this.getSnapshots()
    const history = this.getHistory()
    const existingAgentSnapshot = snapshots[agentId]

    const currentMap = {}
    currentPackages.forEach((pkg) => {
      const k = appKey(pkg)
      currentMap[k] = {
        name: pkg.name,
        version: pkg.version,
        publisher: pkg.vendor || pkg.publisher || 'Unknown',
        architecture: pkg.architecture || 'x86_64',
        installTime: pkg.install_time || null,
        format: pkg.format || 'win',
        scanTime: pkg.scan?.time || new Date().toISOString(),
      }
    })

    const newHistoryItems = []

    if (!existingAgentSnapshot) {
      // First time collecting this agent: seed snapshot
      // Also query historical installer alerts from Indexer to pre-populate genuine change records
      const installerAlerts = await this.queryInstallerAlerts(agentId)
      installerAlerts.forEach((alert) => {
        const ruleId = alert.rule?.id
        const desc = alert.rule?.description || ''
        const eventData = alert.data?.win?.eventdata?.data || desc
        const timestamp = alert['@timestamp'] || alert.timestamp

        let changeType = null
        let appName = 'Unknown'
        let prevVer = null
        let newVer = null

        if (ruleId === '60611' || desc.includes('uninstalled')) {
          changeType = 'Removal confirmed'
          // Extract app name and version from data if comma separated: "AppName, Version, ..."
          const parts = eventData.split(',').map((p) => p.trim())
          if (parts.length >= 2) {
            appName = parts[0].replace(/^Application uninstalled\s*/i, '').trim()
            prevVer = parts[1]
          } else {
            appName = eventData.replace(/^Product:\s*/i, '').replace(/--.*$/, '').trim()
          }
        } else if (ruleId === '60612' || desc.includes('installed')) {
          changeType = 'Newly detected'
          const parts = eventData.split(',').map((p) => p.trim())
          if (parts.length >= 2) {
            appName = parts[0].replace(/^Application installed\s*/i, '').trim()
            newVer = parts[1]
          } else {
            appName = eventData.replace(/^Product:\s*/i, '').replace(/--.*$/, '').trim()
          }
        } else if (ruleId === '2902') {
          changeType = 'Newly detected'
          appName = desc.replace(/^New dpkg\s*/i, '').trim()
        }

        if (changeType && appName) {
          const alertId = alert.id || `hist-${timestamp}-${ruleId}`
          if (!history.some((h) => h.id === alertId)) {
            newHistoryItems.push({
              id: alertId,
              agentId,
              endpoint: endpointName,
              appName,
              previousVersion: prevVer,
              newVersion: newVer,
              changeType,
              timestamp,
              detectionTimestamp: timestamp,
              correlatedEventId: alert.data?.win?.system?.eventID || ruleId,
              ruleId,
              details: desc,
              confirmedByEvent: true,
            })
          }
        }
      })

      // Check if any pairs represent a version change (e.g. Teams 1.26.25904 removed and 1.26.27102 installed within seconds)
      for (let i = 0; i < newHistoryItems.length; i++) {
        const itemA = newHistoryItems[i]
        if (itemA.changeType === 'Newly detected' && itemA.newVersion) {
          const matchingRemoval = newHistoryItems.find(
            (itemB) =>
              itemB.appName === itemA.appName &&
              itemB.changeType === 'Removal confirmed' &&
              itemB.previousVersion &&
              Math.abs(new Date(itemA.timestamp) - new Date(itemB.timestamp)) < 60000
          )
          if (matchingRemoval) {
            itemA.changeType = 'Version changed'
            itemA.previousVersion = matchingRemoval.previousVersion
            matchingRemoval.mergedInto = itemA.id
          }
        }
      }
    } else {
      // Compare against existing snapshot
      const prevMap = existingAgentSnapshot.packages || {}

      // 1. Check for newly detected applications or version changes
      for (const [key, cur] of Object.entries(currentMap)) {
        const prev = prevMap[key]
        if (!prev) {
          // Newly detected in this scan
          newHistoryItems.push({
            id: `change-${agentId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            agentId,
            endpoint: endpointName,
            appName: cur.name,
            previousVersion: null,
            newVersion: cur.version,
            changeType: 'Newly detected',
            timestamp: new Date().toISOString(),
            detectionTimestamp: cur.scanTime,
            correlatedEventId: null,
            details: `Package discovered during inventory scan (${cur.format})`,
            confirmedByEvent: false,
          })
        } else if (prev.version !== cur.version) {
          // Version changed
          newHistoryItems.push({
            id: `change-${agentId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            agentId,
            endpoint: endpointName,
            appName: cur.name,
            previousVersion: prev.version,
            newVersion: cur.version,
            changeType: 'Version changed',
            timestamp: new Date().toISOString(),
            detectionTimestamp: cur.scanTime,
            correlatedEventId: null,
            details: `Version updated from ${prev.version} to ${cur.version}`,
            confirmedByEvent: false,
          })
        }
      }

      // 2. Check for missing packages from previous snapshot
      const installerAlerts = await this.queryInstallerAlerts(agentId)
      for (const [key, prev] of Object.entries(prevMap)) {
        if (!currentMap[key]) {
          // Missing from latest inventory!
          // Correlate with installer alerts to see if removal is confirmed
          const matchingUninstall = installerAlerts.find((alert) => {
            const desc = (alert.rule?.description || '').toLowerCase()
            const data = (alert.data?.win?.eventdata?.data || '').toLowerCase()
            const appLower = prev.name.toLowerCase()
            return (
              (alert.rule?.id === '60611' || desc.includes('uninstalled')) &&
              (desc.includes(appLower) || data.includes(appLower))
            )
          })

          const isConfirmed = Boolean(matchingUninstall)
          newHistoryItems.push({
            id: `change-${agentId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            agentId,
            endpoint: endpointName,
            appName: prev.name,
            previousVersion: prev.version,
            newVersion: null,
            changeType: isConfirmed ? 'Removal confirmed' : 'Missing from latest inventory',
            timestamp: new Date().toISOString(),
            detectionTimestamp: new Date().toISOString(),
            correlatedEventId: matchingUninstall?.data?.win?.system?.eventID || null,
            details: isConfirmed
              ? `Uninstallation confirmed by MsiInstaller event (Rule 60611)`
              : `Package not observed in current scan. Status: Missing from latest inventory (uninstallation unconfirmed).`,
            confirmedByEvent: isConfirmed,
          })
        }
      }
    }

    // Save snapshot
    snapshots[agentId] = {
      timestamp: new Date().toISOString(),
      endpoint: endpointName,
      packages: currentMap,
    }
    this.saveSnapshots(snapshots)

    // Save history
    if (newHistoryItems.length > 0) {
      const activeNewItems = newHistoryItems.filter((i) => !i.mergedInto)
      const updatedHistory = [...activeNewItems, ...history]
      this.saveHistory(updatedHistory)
    }

    return newHistoryItems
  },
}

import axios from 'axios'
import { config, httpsAgent } from '../config/env.js'
import { logger } from '../utils/logger.js'
import { wazuhAuthService } from './wazuhAuth.service.js'

/**
 * Service for interacting with the Wazuh Manager REST API (Port 55000).
 */
export const wazuhApiService = {
  /**
   * Internal request executor with automatic JWT bearer injection and 401 retry.
   */
  async request(method, path, options = {}) {
    let token = await wazuhAuthService.getToken()
    const url = `${config.wazuh.apiBaseUrl}${path}`

    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      ...options.headers,
    }

    try {
      const response = await axios({
        method,
        url,
        headers,
        params: options.params,
        data: options.data,
        httpsAgent,
        timeout: options.timeout || 10000,
      })
      return response.data
    } catch (err) {
      // If 401 Unauthorized, invalidate token and retry once
      if (err.response?.status === 401 && !options._retried) {
        logger.warn('Wazuh Manager returned 401 Unauthorized. Refreshing token and retrying...')
        wazuhAuthService.invalidateToken()
        return this.request(method, path, { ...options, _retried: true })
      }
      throw err
    }
  },

  /**
   * Check Wazuh Manager daemon operational status.
   * Endpoint: GET /manager/status
   */
  async getStatus() {
    return this.request('GET', '/manager/status')
  },

  /**
   * Get Wazuh Manager daemon information.
   * Endpoint: GET /manager/info
   */
  async getInfo() {
    return this.request('GET', '/manager/info')
  },

  /**
   * Query registered Wazuh agents.
   * Endpoint: GET /agents
   */
  async getAgents(params = {}) {
    return this.request('GET', '/agents', { params })
  },

  /**
   * Query specific Wazuh agent by ID.
   * Endpoint: GET /agents?agents_list=:id
   */
  async getAgent(agentId) {
    return this.request('GET', `/agents`, { params: { agents_list: agentId } })
  },

  /**
   * Query Wazuh detection rules.
   * Endpoint: GET /rules
   */
  async getRules(params = {}) {
    return this.request('GET', '/rules', { params })
  },

  /**
   * Query Syscheck (FIM) database for an agent.
   * Endpoint: GET /syscheck/:agent_id
   */
  async getSyscheck(agentId, params = {}) {
    return this.request('GET', `/syscheck/${agentId}`, { params })
  },
}

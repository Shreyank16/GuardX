import { Buffer } from 'node:buffer'
import axios from 'axios'
import { config, httpsAgent } from '../config/env.js'

/**
 * Service for interacting with the Wazuh Indexer / OpenSearch cluster (Port 9200).
 * Queries historical security alerts and telemetry stored in `wazuh-alerts-4.x-*` indices.
 */
export const wazuhIndexerService = {
  /**
   * Internal request executor using HTTP Basic Authentication.
   */
  async request(method, path, options = {}) {
    const { indexerBaseUrl, indexerUser, indexerPassword } = config.wazuh
    const url = `${indexerBaseUrl}${path}`

    const headers = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...options.headers,
    }

    if (indexerUser && indexerPassword) {
      const auth = Buffer.from(`${indexerUser}:${indexerPassword}`).toString('base64')
      headers.Authorization = `Basic ${auth}`
    }

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
  },

  /**
   * Check Indexer cluster health.
   * Endpoint: GET /_cluster/health
   */
  async getClusterHealth() {
    return this.request('GET', '/_cluster/health')
  },

  /**
   * Search an index (e.g., wazuh-alerts-4.x-*).
   * Endpoint: POST /:index/_search
   */
  async search(index = 'wazuh-alerts-4.x-*', queryBody = {}) {
    return this.request('POST', `/${index}/_search`, { data: queryBody })
  },
}

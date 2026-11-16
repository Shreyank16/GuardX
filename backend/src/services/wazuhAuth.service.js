import { Buffer } from 'node:buffer'
import axios from 'axios'
import { config, httpsAgent } from '../config/env.js'
import { logger } from '../utils/logger.js'

let cachedToken = null
let tokenExpiresAt = 0

/**
 * Service managing Wazuh Manager API authentication and JWT token lifecycle.
 * The Wazuh Manager issues a JWT bearer token upon Basic Auth authentication.
 */
export const wazuhAuthService = {
  /**
   * Fetch a valid JWT token, reusing cached token if not expired.
   */
  async getToken() {
    const now = Date.now()
    // Reuse cached token if valid for at least another 60 seconds
    if (cachedToken && tokenExpiresAt > now + 60_000) {
      return cachedToken
    }

    const { apiBaseUrl, apiUser, apiPassword } = config.wazuh
    if (!apiPassword) {
      throw new Error('WAZUH_API_PASSWORD is not configured in backend environment.')
    }

    const url = `${apiBaseUrl}/security/user/authenticate`
    logger.debug(`Authenticating with Wazuh Manager at ${url} as user '${apiUser}'`)

    try {
      const authHeader = Buffer.from(`${apiUser}:${apiPassword}`).toString('base64')
      const response = await axios.post(
        url,
        {},
        {
          httpsAgent,
          headers: {
            Authorization: `Basic ${authHeader}`,
            Accept: 'application/json',
          },
          timeout: 8000,
        }
      )

      const token = response.data?.data?.token || response.data?.token
      if (!token) {
        throw new Error('Wazuh authentication response did not contain a JWT token.')
      }

      cachedToken = token
      // Wazuh tokens typically expire after 900 seconds (15 minutes). Default to 14 mins safety margin.
      tokenExpiresAt = Date.now() + 14 * 60 * 1000

      logger.info('Successfully authenticated with Wazuh Manager API (JWT acquired).')
      return cachedToken
    } catch (err) {
      cachedToken = null
      tokenExpiresAt = 0
      const status = err.response?.status
      const detail = err.response?.data?.message || err.message
      logger.error(`Wazuh authentication failed (HTTP ${status || 'ERR'}): ${detail}`)
      throw new Error(`Wazuh Manager authentication error: ${detail}`, { cause: err })
    }
  },

  /**
   * Invalidate cached token (e.g. after receiving a 401 Unauthorized from the manager API).
   */
  invalidateToken() {
    cachedToken = null
    tokenExpiresAt = 0
    logger.debug('Wazuh JWT token invalidated.')
  },
}

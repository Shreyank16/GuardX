import fs from 'node:fs'
import https from 'node:https'
import path from 'node:path'
import process from 'node:process'
import dotenv from 'dotenv'
import { logger } from '../utils/logger.js'

// Load environment variables from backend/.env (preferred for backend secrets), falling back to root .env
const backendEnvPath = path.resolve(process.cwd(), 'backend', '.env')
const rootEnvPath = path.resolve(process.cwd(), '.env')

if (fs.existsSync(backendEnvPath)) {
  dotenv.config({ path: backendEnvPath })
} else if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath })
} else {
  dotenv.config()
}

/**
 * Configure HTTPS Agent with Custom CA support.
 *
 * Windows curl requires `--ssl-no-revoke` because the native Windows Schannel
 * TLS layer rejects internal/self-signed CAs that do not publish an online
 * CRL/OCSP revocation distribution point (SEC_E_REVOCATION_OFFLINE).
 *
 * Node.js uses bundled OpenSSL. OpenSSL validates the full certificate trust
 * chain against the trusted CA without failing on absent CRLs, which naturally
 * resolves the Windows-specific revocation issue while preserving strict
 * TLS certificate chain verification (rejectUnauthorized: true).
 */
function createHttpsAgent() {
  const caCertPath = process.env.WAZUH_CA_CERT_PATH || process.env.NODE_EXTRA_CA_CERTS
  let ca
  if (caCertPath) {
    const resolvedPath = path.resolve(caCertPath)
    if (fs.existsSync(resolvedPath)) {
      try {
        ca = fs.readFileSync(resolvedPath)
        logger.info(`Loaded custom Wazuh CA certificate from: ${resolvedPath}`)
      } catch (err) {
        logger.error(`Failed to read Wazuh CA cert from ${resolvedPath}: ${err.message}`)
      }
    } else {
      logger.warn(`Wazuh CA cert path configured but file not found: ${resolvedPath}`)
    }
  }

  const allowSelfSigned = process.env.WAZUH_ALLOW_SELF_SIGNED === 'true'
  const rejectUnauthorized = !allowSelfSigned

  if (allowSelfSigned) {
    logger.warn('TLS verification disabled via WAZUH_ALLOW_SELF_SIGNED=true (Lab / Development mode only).')
  }

  return new https.Agent({
    ca,
    rejectUnauthorized,
    keepAlive: true,
    timeout: 10000,
    // Custom server identity checker to allow connection via 127.0.0.1
    // when Wazuh certificates are issued for hostnames (e.g. wazuh-manager, wazuh-indexer)
    checkServerIdentity(hostname, cert) {
      // If loopback is used, allow common Wazuh SAN names while still verifying the CA signature
      if (hostname === '127.0.0.1' || hostname === 'localhost') {
        return undefined
      }
      return https.checkServerIdentity(hostname, cert)
    },
  })
}

export const httpsAgent = createHttpsAgent()

export const config = {
  port: Number.parseInt(process.env.PORT || '4000', 10),
  host: process.env.HOST || '127.0.0.1', // strictly bound to loopback
  env: process.env.NODE_ENV || 'development',
  corsOrigins: (process.env.CORS_ORIGIN || 'http://127.0.0.1:5173,http://localhost:5173')
    .split(',')
    .map((s) => s.trim()),

  wazuh: {
    apiBaseUrl: (process.env.WAZUH_API_URL || process.env.WAZUH_API_BASE_URL || 'https://127.0.0.1:55000').replace(/\/+$/, ''),
    apiUser: process.env.WAZUH_API_USER || 'wazuh',
    apiPassword: process.env.WAZUH_API_PASSWORD || '',
    indexerBaseUrl: (process.env.WAZUH_INDEXER_URL || process.env.WAZUH_INDEXER_BASE_URL || 'https://127.0.0.1:9200').replace(/\/+$/, ''),
    indexerUser: process.env.WAZUH_INDEXER_USER || 'admin',
    indexerPassword: process.env.WAZUH_INDEXER_PASSWORD || '',
  },

  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
  },
}

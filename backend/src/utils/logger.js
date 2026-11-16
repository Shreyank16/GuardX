/**
 * GuardX Structured Logger with Credential Redaction
 * Ensures sensitive headers, passwords, and tokens are never printed.
 */

import process from 'node:process'

const SENSITIVE_KEYS = new Set([
  'password',
  'pass',
  'token',
  'jwt',
  'authorization',
  'auth',
  'secret',
  'key',
  'cookie',
  'wazuh_api_password',
  'wazuh_indexer_password',
])

function redact(value) {
  if (value == null) return value
  if (typeof value === 'string') {
    // Redact bearer tokens if present in raw strings
    if (value.toLowerCase().startsWith('bearer ')) {
      return 'Bearer [REDACTED]'
    }
    return value
  }
  if (Array.isArray(value)) {
    return value.map(redact)
  }
  if (typeof value === 'object') {
    const sanitized = {}
    for (const [k, v] of Object.entries(value)) {
      if (SENSITIVE_KEYS.has(k.toLowerCase())) {
        sanitized[k] = '[REDACTED]'
      } else {
        sanitized[k] = redact(v)
      }
    }
    return sanitized
  }
  return value
}

function format(level, message, meta) {
  const timestamp = new Date().toISOString()
  const base = `[${timestamp}] [GUARDX-BACKEND] [${level.toUpperCase()}] ${message}`
  if (meta !== undefined) {
    const cleanMeta = redact(meta)
    return `${base} ${typeof cleanMeta === 'object' ? JSON.stringify(cleanMeta) : cleanMeta}`
  }
  return base
}

export const logger = {
  info(message, meta) {
    console.log(format('info', message, meta))
  },
  warn(message, meta) {
    console.warn(format('warn', message, meta))
  },
  error(message, meta) {
    console.error(format('error', message, meta))
  },
  debug(message, meta) {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(format('debug', message, meta))
    }
  },
}

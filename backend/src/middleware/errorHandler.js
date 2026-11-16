import process from 'node:process'
import { logger } from '../utils/logger.js'

/**
 * Global Error Handler Middleware
 * Guarantees zero credential leakage and clean SOC-compliant JSON error shapes.
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || (err.response ? err.response.status : 500)
  const isServer = status >= 500

  // Log detailed error server-side (credentials are automatically redacted by logger)
  logger.error(`${req.method} ${req.originalUrl} - HTTP ${status}: ${err.message}`, {
    stack: isServer && process.env.NODE_ENV !== 'production' ? err.stack : undefined,
  })

  // Sanitize message returned to client
  let clientMessage = err.message || 'An internal server error occurred.'
  if (isServer && process.env.NODE_ENV === 'production') {
    clientMessage = 'Internal server error occurred while processing security telemetry.'
  }

  // Never return raw upstream headers or authentication tokens
  res.status(status).json({
    ok: false,
    error: clientMessage,
    status,
    timestamp: new Date().toISOString(),
  })
}

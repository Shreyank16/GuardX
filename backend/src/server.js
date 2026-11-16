import process from 'node:process'
import { app } from './app.js'
import { config } from './config/env.js'
import { logger } from './utils/logger.js'

const { port, host } = config

// Ensure strictly bound to loopback 127.0.0.1
const server = app.listen(port, host, () => {
  logger.info(`========================================================`)
  logger.info(` GuardX Security Monitoring & SIEM Backend Operational `)
  logger.info(` Listening strictly on: http://${host}:${port}`)
  logger.info(` Environment: ${config.env}`)
  logger.info(` Wazuh Manager API: ${config.wazuh.apiBaseUrl}`)
  logger.info(` Wazuh Indexer API: ${config.wazuh.indexerBaseUrl}`)
  logger.info(`========================================================`)
})

server.on('error', (err) => {
  logger.error(`Fatal server error: ${err.message}`)
  process.exit(1)
})

// Graceful shutdown handling
function handleShutdown(signal) {
  logger.info(`Received ${signal}. Shutting down GuardX backend gracefully...`)
  server.close(() => {
    logger.info('HTTP server closed.')
    process.exit(0)
  })

  // Force close after 5 seconds if connections linger
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully terminating.')
    process.exit(1)
  }, 5000)
}

process.on('SIGINT', () => handleShutdown('SIGINT'))
process.on('SIGTERM', () => handleShutdown('SIGTERM'))

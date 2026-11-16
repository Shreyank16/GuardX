import cors from 'cors'
import express from 'express'
import { config } from './config/env.js'
import { errorHandler } from './middleware/errorHandler.js'
import { apiRouter } from './routes/index.js'
import { logger } from './utils/logger.js'

export const app = express()

// Security hardening: hide server fingerprint
app.disable('x-powered-by')

// CORS configuration (restricted strictly to local development and configured origins)
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, or same-origin server proxies)
      if (!origin) return callback(null, true)
      if (config.corsOrigins.includes(origin) || config.env === 'development') {
        return callback(null, true)
      }
      return callback(new Error(`Origin '${origin}' not allowed by GuardX CORS policy`))
    },
    credentials: true,
  })
)

// Request parsing
app.use(express.json({ limit: '1mb' }))

// Request logging (sanitized)
app.use((req, res, next) => {
  const start = Date.now()
  res.on('finish', () => {
    const duration = Date.now() - start
    logger.debug(`${req.method} ${req.originalUrl} ${res.statusCode} (${duration}ms)`)
  })
  next()
})

// Mount API routes under /api
app.use('/api', apiRouter)

// Fallback 404 handler for unknown API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    ok: false,
    error: `API route '${req.method} ${req.originalUrl}' not found.`,
    status: 404,
  })
})

// Global error handler
app.use(errorHandler)

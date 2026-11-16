import { Router } from 'express'
import { alertsRouter } from './alerts.routes.js'
import { applicationsRouter } from './applications.routes.js'
import { endpointsRouter } from './endpoints.routes.js'
import { healthRouter } from './health.routes.js'
import { rulesRouter } from './rules.routes.js'
import { telemetryRouter } from './telemetry.routes.js'
import { threatIntelRouter } from './threatIntel.routes.js'

export const apiRouter = Router()

// Mount sub-routes
apiRouter.use('/', healthRouter)
apiRouter.use('/', alertsRouter)
apiRouter.use('/', endpointsRouter)
apiRouter.use('/', rulesRouter)
apiRouter.use('/', telemetryRouter)
apiRouter.use('/', applicationsRouter)
apiRouter.use('/', threatIntelRouter)

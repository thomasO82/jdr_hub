import type { Hono } from 'hono'
import { createApplicationHandlers, type ApplicationsDependencies, type ApplicationsRouteEnv } from './handlers.js'

export function registerApplicationRoutes(app: Hono<ApplicationsRouteEnv>, dependencies: ApplicationsDependencies): void {
  const handlers = createApplicationHandlers(dependencies)
  app.post('/games/:id/applications', handlers.submit)
  app.get('/games/:id/application', handlers.getMineForGame)
  app.get('/applications', handlers.listMine)
  app.get('/games/:id/applications', handlers.listForGame)
  app.patch('/applications/:id', handlers.decide)
}

import type { Hono } from 'hono'
import { createDashboardHandlers, type DashboardDependencies, type DashboardRouteEnv } from './handlers.js'

export function registerDashboardRoutes(app: Hono<DashboardRouteEnv>, dependencies: DashboardDependencies): void {
  const handlers = createDashboardHandlers(dependencies)
  app.get('/dashboard', handlers.dashboard)
  app.get('/games/:gameId/manage', handlers.management)
}

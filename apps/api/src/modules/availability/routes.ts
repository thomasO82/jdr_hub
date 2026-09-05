import type { Hono } from 'hono'
import { createAvailabilityHandlers, type AvailabilityDependencies, type AvailabilityRouteEnv } from './handlers.js'

export function registerAvailabilityRoutes(app: Hono<AvailabilityRouteEnv>, dependencies: AvailabilityDependencies): void {
  const handlers = createAvailabilityHandlers(dependencies)
  app.get('/availability', handlers.getAvailability)
  app.put('/availability', handlers.replaceAvailability)
  app.get('/players', handlers.searchPlayers)
}

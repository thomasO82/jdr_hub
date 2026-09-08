import type { Hono } from 'hono'
import { createGamificationHandlers, type GamificationDependencies, type GamificationRouteEnv } from './handlers.js'

export function registerGamificationRoutes(app: Hono<GamificationRouteEnv>, dependencies: GamificationDependencies): void {
  const handlers = createGamificationHandlers(dependencies)
  app.get('/profile/xp', handlers.xpHistory)
}

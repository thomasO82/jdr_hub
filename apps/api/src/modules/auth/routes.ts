import type { Hono } from 'hono'
import { createAuthHandlers, type AuthDependencies } from './handlers.js'

export type AuthRouteEnv = { Variables: { requestId: string } }

export function registerAuthRoutes(app: Hono<AuthRouteEnv>, dependencies: AuthDependencies): void {
  const handlers = createAuthHandlers(dependencies)
  app.get('/auth/discord', handlers.discordLogin)
  app.get('/auth/discord/callback', handlers.discordCallback)
  app.get('/me', handlers.getCurrentUser)
  app.post('/auth/logout', handlers.logout)
  app.post('/auth/refresh', handlers.refreshSession)
}

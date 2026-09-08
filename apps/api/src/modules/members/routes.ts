import type { Hono } from 'hono'
import { createMemberHandlers, type MemberRouteEnv, type MembersDependencies } from './handlers.js'

export function registerMemberRoutes(app: Hono<MemberRouteEnv>, dependencies: MembersDependencies): void {
  const handlers = createMemberHandlers(dependencies)
  app.get('/games/:gameId/members', handlers.list)
  app.delete('/games/:gameId/members/:userId', handlers.remove)
}

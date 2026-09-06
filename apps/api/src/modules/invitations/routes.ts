import type { Hono } from 'hono'
import { createInvitationHandlers, type InvitationRouteEnv, type InvitationsDependencies } from './handlers.js'

export function registerInvitationRoutes(app: Hono<InvitationRouteEnv>, dependencies: InvitationsDependencies): void {
  const handlers = createInvitationHandlers(dependencies)
  app.post('/games/:gameId/invitations', handlers.create)
  app.get('/games/:gameId/invitations', handlers.listForGame)
  app.get('/invitations', handlers.listMine)
  app.patch('/invitations/:invitationId', handlers.decide)
}

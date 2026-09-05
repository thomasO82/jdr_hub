import type { Hono } from 'hono'
import { createSchedulingHandlers, type SchedulingDependencies, type SchedulingRouteEnv } from './handlers.js'

export function registerSchedulingRoutes(app: Hono<SchedulingRouteEnv>, dependencies: SchedulingDependencies): void {
  const handlers = createSchedulingHandlers(dependencies)
  app.post('/games/:id/proposals', handlers.createProposals)
  app.get('/games/:id/proposals', handlers.listProposals)
  app.post('/proposals/:id/votes', handlers.castVote)
  app.post('/games/:id/sessions', handlers.createSession)
  app.get('/planning', handlers.getPlanning)
}


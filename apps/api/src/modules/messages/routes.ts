import type { Hono } from 'hono'
import { createMessageHandlers, type MessagesDependencies, type MessagesRouteEnv } from './handlers.js'

export function registerMessageRoutes(app: Hono<MessagesRouteEnv>, dependencies: MessagesDependencies): void {
  const handlers = createMessageHandlers(dependencies)
  app.get('/games/:gameId/messages', handlers.list)
  app.post('/games/:gameId/messages', handlers.create)
  app.get('/games/:gameId/messages/stream', handlers.stream)
}

import type { Hono } from 'hono'
import { createNotificationHandlers, type NotificationRouteEnv, type NotificationsDependencies } from './handlers.js'

export function registerNotificationRoutes(app: Hono<NotificationRouteEnv>, dependencies: NotificationsDependencies): void {
  const handlers = createNotificationHandlers(dependencies)
  app.get('/notifications', handlers.list)
  app.post('/notifications/:id/read', handlers.markRead)
}

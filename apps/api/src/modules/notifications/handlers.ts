import type { Context } from 'hono'
import { absenceCommandSchema, notificationQuerySchema } from '@jdr-hub/shared'
import { readAccessToken } from '../auth/cookies.js'
import type { AuthConfig } from '../auth/config.js'
import type { AuthRepository } from '../auth/repository.js'
import { authenticateUser } from '../auth/services/authenticate-user.js'
import type { NotificationRepository } from './repository.js'
import { listNotifications } from './services/list-notifications.js'
import { markNotificationRead } from './services/mark-notification-read.js'

export type NotificationsDependencies = {
  authConfig: AuthConfig
  authRepository: AuthRepository
  repository: NotificationRepository
  now?: () => Date
}

export type NotificationRouteEnv = { Variables: { requestId: string } }

function error(c: Context<NotificationRouteEnv>, status: 400 | 401 | 403 | 404 | 429) {
  return c.json({ data: null, error: { code: 'NOTIFICATION_ERROR', message: 'La notification n’a pas pu être traitée.' }, meta: { requestId: c.get('requestId') } }, status)
}

export function createNotificationHandlers(dependencies: NotificationsDependencies) {
  const now = dependencies.now ?? (() => new Date())
  const limits = new Map<string, { startedAt: number; count: number }>()
  const allowed = (userId: string): boolean => {
    const currentTime = Date.now()
    const current = limits.get(userId)
    if (!current || currentTime - current.startedAt >= 60_000) {
      limits.set(userId, { startedAt: currentTime, count: 1 })
      return true
    }
    if (current.count >= 60) return false
    current.count += 1
    return true
  }
  async function currentUser(c: Context<NotificationRouteEnv>) {
    const token = readAccessToken(c)
    return token ? authenticateUser({ config: dependencies.authConfig, repository: dependencies.authRepository, token, now: now() }) : null
  }
  const trustedOrigin = (c: Context<NotificationRouteEnv>): boolean => c.req.header('origin') === dependencies.authConfig.appOrigin

  return {
    list: async (c: Context<NotificationRouteEnv>) => {
      const user = await currentUser(c)
      if (!user) return error(c, 401)
      const parsed = notificationQuerySchema.safeParse(c.req.query())
      if (!parsed.success) return error(c, 400)
      try {
        const data = await listNotifications({ userId: user.id, cursor: parsed.data.cursor ?? null, limit: parsed.data.limit, repository: dependencies.repository })
        return c.json({ data, error: null, meta: { requestId: c.get('requestId') } })
      } catch { return error(c, 400) }
    },
    markRead: async (c: Context<NotificationRouteEnv>) => {
      const user = await currentUser(c)
      if (!user) return error(c, 401)
      if (!trustedOrigin(c)) return error(c, 403)
      if (!allowed(user.id)) return error(c, 429)
      const notificationId = c.req.param('id')
      const parsed = absenceCommandSchema.safeParse(await c.req.json().catch(() => null))
      if (!notificationId || !parsed.success) return error(c, 400)
      try {
        const marked = await markNotificationRead({ notificationId, userId: user.id, repository: dependencies.repository, now })
        return marked ? c.body(null, 204) : error(c, 404)
      } catch { return error(c, 400) }
    },
  }
}

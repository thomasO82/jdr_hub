import type { Context } from 'hono'
import { readAccessToken } from '../auth/cookies.js'
import type { AuthConfig } from '../auth/config.js'
import type { AuthRepository } from '../auth/repository.js'
import { authenticateUser } from '../auth/services/authenticate-user.js'
import type { NotificationRepository } from '../notifications/repository.js'
import { getDashboard } from './services/get-dashboard.js'
import type { DashboardRepository } from './repository.js'

export type DashboardDependencies = {
  authConfig: AuthConfig
  authRepository: AuthRepository
  repository: DashboardRepository
  notificationsRepository: NotificationRepository
  now?: () => Date
}

export type DashboardRouteEnv = { Variables: { requestId: string } }

function error(c: Context<DashboardRouteEnv>, status: 401 | 500) {
  const message = status === 401 ? 'Vous devez être connecté pour consulter le tableau de bord.' : 'Le tableau de bord est momentanément indisponible. Réessayez.'
  return c.json({ data: null, error: { code: status === 401 ? 'UNAUTHORIZED' : 'INTERNAL_ERROR', message }, meta: { requestId: c.get('requestId') } }, status)
}

export function createDashboardHandlers(dependencies: DashboardDependencies) {
  const now = dependencies.now ?? (() => new Date())

  return {
    get: async (c: Context<DashboardRouteEnv>) => {
      const token = readAccessToken(c)
      const user = token ? await authenticateUser({ config: dependencies.authConfig, repository: dependencies.authRepository, token, now: now() }) : null
      if (!user) return error(c, 401)
      try {
        const data = await getDashboard({ userId: user.id, now: now(), repository: dependencies.repository, notificationsRepository: dependencies.notificationsRepository })
        return c.json({ data, error: null, meta: { requestId: c.get('requestId') } })
      } catch {
        return error(c, 500)
      }
    },
  }
}

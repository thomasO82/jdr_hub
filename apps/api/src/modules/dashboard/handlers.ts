import type { Context } from 'hono'
import { readAccessToken } from '../auth/cookies.js'
import type { AuthConfig } from '../auth/config.js'
import type { AuthRepository } from '../auth/repository.js'
import { authenticateUser } from '../auth/services/authenticate-user.js'
import type { DashboardRepository } from './repository.js'
import { getDashboard } from './services/get-dashboard.js'
import { getGameManagement } from './services/get-game-management.js'

export type DashboardDependencies = {
  authConfig: AuthConfig
  authRepository: AuthRepository
  repository: DashboardRepository
  now?: () => Date
}

export type DashboardRouteEnv = { Variables: { requestId: string } }

function error(c: Context<DashboardRouteEnv>, status: 400 | 401 | 404 | 500) {
  const message = status === 401
    ? 'Connectez-vous pour accéder à votre tableau de bord.'
    : status === 404
      ? 'Cette partie est introuvable.'
      : status === 500
        ? 'Une erreur interne est survenue. Réessayez plus tard.'
        : 'La demande de tableau de bord est invalide.'
  return c.json({ data: null, error: { code: status === 500 ? 'INTERNAL_ERROR' : 'DASHBOARD_ERROR', message }, meta: { requestId: c.get('requestId') } }, status)
}

function domainStatus(value: unknown): 404 | 500 {
  return value instanceof Error && value.message === 'DASHBOARD_NOT_FOUND' ? 404 : 500
}

export function createDashboardHandlers(dependencies: DashboardDependencies) {
  const now = dependencies.now ?? (() => new Date())

  async function currentUser(c: Context<DashboardRouteEnv>) {
    const token = readAccessToken(c)
    return token ? authenticateUser({ config: dependencies.authConfig, repository: dependencies.authRepository, token, now: now() }) : null
  }

  return {
    dashboard: async (c: Context<DashboardRouteEnv>) => {
      const user = await currentUser(c)
      if (!user) return error(c, 401)
      try {
        const dashboard = await getDashboard({ userId: user.id, repository: dependencies.repository, now })
        return c.json({ data: dashboard, error: null, meta: { requestId: c.get('requestId') } })
      } catch (value) {
        return error(c, domainStatus(value))
      }
    },
    management: async (c: Context<DashboardRouteEnv>) => {
      const user = await currentUser(c)
      if (!user) return error(c, 401)
      const gameId = c.req.param('gameId')
      if (!gameId) return error(c, 400)
      try {
        const management = await getGameManagement({ userId: user.id, gameId, repository: dependencies.repository, now })
        return c.json({ data: management, error: null, meta: { requestId: c.get('requestId') } })
      } catch (value) {
        return error(c, domainStatus(value))
      }
    },
  }
}

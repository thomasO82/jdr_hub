import type { Context } from 'hono'
import { z } from 'zod'
import { readAccessToken } from '../auth/cookies.js'
import type { AuthConfig } from '../auth/config.js'
import type { AuthRepository } from '../auth/repository.js'
import { authenticateUser } from '../auth/services/authenticate-user.js'
import type { GamificationRepository } from './repository.js'
import { getXpHistory } from './services/get-xp-history.js'

export type GamificationDependencies = {
  authConfig: AuthConfig
  authRepository: AuthRepository
  repository: GamificationRepository
  now?: () => Date
}

export type GamificationRouteEnv = { Variables: { requestId: string } }

function error(c: Context<GamificationRouteEnv>, status: 400 | 401 | 500) {
  const message = status === 401
    ? 'Connectez-vous pour consulter votre progression.'
    : status === 400
      ? 'La demande d’historique XP est invalide.'
      : 'Une erreur interne est survenue. Réessayez plus tard.'
  return c.json({ data: null, error: { code: status === 500 ? 'INTERNAL_ERROR' : 'XP_HISTORY_ERROR', message }, meta: { requestId: c.get('requestId') } }, status)
}

function isClientError(value: unknown): boolean {
  return value instanceof z.ZodError || (value instanceof Error && value.message === 'INVALID_CURSOR')
}

export function createGamificationHandlers(dependencies: GamificationDependencies) {
  const now = dependencies.now ?? (() => new Date())

  async function currentUser(c: Context<GamificationRouteEnv>) {
    const token = readAccessToken(c)
    return token ? authenticateUser({ config: dependencies.authConfig, repository: dependencies.authRepository, token, now: now() }) : null
  }

  return {
    xpHistory: async (c: Context<GamificationRouteEnv>) => {
      const user = await currentUser(c)
      if (!user) return error(c, 401)
      try {
        const query = c.req.query()
        const page = await getXpHistory({ userId: user.id, query: { cursor: query.cursor, limit: query.limit }, repository: dependencies.repository })
        const data = {
          ...page,
          items: page.items.map((item) => ({ id: item.id, sessionId: item.sessionId, amount: item.amount, reason: item.reason, createdAt: item.createdAt })),
        }
        return c.json({ data, error: null, meta: { requestId: c.get('requestId') } })
      } catch (value) {
        return error(c, isClientError(value) ? 400 : 500)
      }
    },
  }
}

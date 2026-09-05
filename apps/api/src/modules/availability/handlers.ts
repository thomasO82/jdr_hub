import type { Context } from 'hono'
import { availabilityPayloadSchema, playerQuerySchema } from '@jdr-hub/shared'
import { readAccessToken } from '../auth/cookies.js'
import type { AuthConfig } from '../auth/config.js'
import type { AuthRepository } from '../auth/repository.js'
import { authenticateUser } from '../auth/services/authenticate-user.js'
import type { AvailabilityRepository } from './repository.js'
import { getAvailability } from './services/get-availability.js'
import { replaceAvailability } from './services/replace-availability.js'
import { searchPlayers } from './services/search-players.js'

export type AvailabilityDependencies = {
  authConfig: AuthConfig
  authRepository: AuthRepository
  repository: AvailabilityRepository
  now?: () => Date
}

export type AvailabilityRouteEnv = { Variables: { requestId: string } }

function error(c: Context<AvailabilityRouteEnv>, status: 400 | 401 | 403) {
  return c.json({ data: null, error: { code: 'AVAILABILITY_ERROR', message: 'Availability request failed' }, meta: { requestId: c.get('requestId') } }, status)
}

export function createAvailabilityHandlers(dependencies: AvailabilityDependencies) {
  const now = dependencies.now ?? (() => new Date())
  async function currentUser(c: Context<AvailabilityRouteEnv>) {
    const token = readAccessToken(c)
    return token ? authenticateUser({ config: dependencies.authConfig, repository: dependencies.authRepository, token, now: now() }) : null
  }
  function trustedOrigin(c: Context<AvailabilityRouteEnv>): boolean {
    return c.req.header('origin') === dependencies.authConfig.appOrigin
  }

  return {
    getAvailability: async (c: Context<AvailabilityRouteEnv>) => {
      const user = await currentUser(c)
      if (!user) return error(c, 401)
      try {
        const data = await getAvailability({ userId: user.id, repository: dependencies.repository })
        return c.json({ data, error: null, meta: { requestId: c.get('requestId') } })
      } catch {
        return error(c, 400)
      }
    },
    replaceAvailability: async (c: Context<AvailabilityRouteEnv>) => {
      const user = await currentUser(c)
      if (!user) return error(c, 401)
      if (!trustedOrigin(c)) return error(c, 403)
      const parsed = availabilityPayloadSchema.safeParse(await c.req.json().catch(() => null))
      if (!parsed.success) return error(c, 400)
      try {
        const data = await replaceAvailability({ userId: user.id, payload: parsed.data, repository: dependencies.repository, now })
        return c.json({ data, error: null, meta: { requestId: c.get('requestId') } })
      } catch {
        return error(c, 400)
      }
    },
    searchPlayers: async (c: Context<AvailabilityRouteEnv>) => {
      const user = await currentUser(c)
      if (!user) return error(c, 401)
      const parsed = playerQuerySchema.safeParse(c.req.query())
      if (!parsed.success) return error(c, 400)
      try {
        const data = await searchPlayers({ viewerId: user.id, query: parsed.data, repository: dependencies.repository })
        return c.json({ data, error: null, meta: { requestId: c.get('requestId') } })
      } catch {
        return error(c, 400)
      }
    },
  }
}

import type { Context } from 'hono'
import { applicationCommandSchema, applicationDecisionSchema } from '@jdr-hub/shared'
import { readAccessToken } from '../auth/cookies.js'
import type { AuthConfig } from '../auth/config.js'
import type { AuthRepository } from '../auth/repository.js'
import { authenticateUser } from '../auth/services/authenticate-user.js'
import type { ApplicationRepository } from './repository.js'
import { decideApplication } from './services/decide-application.js'
import { listGameApplications } from './services/list-game-applications.js'
import { listMyApplications } from './services/list-my-applications.js'
import { submitApplication } from './services/submit-application.js'

export type ApplicationsDependencies = {
  authConfig: AuthConfig
  authRepository: AuthRepository
  repository: ApplicationRepository
  now?: () => Date
}

export type ApplicationsRouteEnv = { Variables: { requestId: string } }

function error(c: Context<ApplicationsRouteEnv>, status: 400 | 401 | 403 | 404 | 409) {
  return c.json({ data: null, error: { code: 'APPLICATION_ERROR', message: 'Application request failed' }, meta: { requestId: c.get('requestId') } }, status)
}

function domainStatus(errorValue: unknown): 403 | 404 | 409 {
  if (errorValue instanceof Error && errorValue.message === 'APPLICATION_FORBIDDEN') return 403
  if (errorValue instanceof Error && errorValue.message === 'APPLICATION_NOT_FOUND') return 404
  return 409
}

function requiredParam(c: Context<ApplicationsRouteEnv>, name: string): string | null {
  const value = c.req.param(name)
  return value && value.length > 0 ? value : null
}

export function createApplicationHandlers(dependencies: ApplicationsDependencies) {
  const now = dependencies.now ?? (() => new Date())
  async function currentUser(c: Context<ApplicationsRouteEnv>) {
    const token = readAccessToken(c)
    return token ? authenticateUser({ config: dependencies.authConfig, repository: dependencies.authRepository, token, now: now() }) : null
  }
  function trustedOrigin(c: Context<ApplicationsRouteEnv>): boolean {
    return c.req.header('origin') === dependencies.authConfig.appOrigin
  }

  return {
    submit: async (c: Context<ApplicationsRouteEnv>) => {
      const user = await currentUser(c)
      if (!user) return error(c, 401)
      if (!trustedOrigin(c)) return error(c, 403)
      const gameId = requiredParam(c, 'id')
      if (!gameId) return error(c, 400)
      const parsed = applicationCommandSchema.safeParse(await c.req.json().catch(() => null))
      if (!parsed.success) return error(c, 400)
      try {
        const application = await submitApplication({ userId: user.id, gameId, message: parsed.data.message, repository: dependencies.repository })
        return c.json({ data: application, error: null, meta: { requestId: c.get('requestId') } }, 201)
      } catch (value) { return error(c, domainStatus(value)) }
    },
    listMine: async (c: Context<ApplicationsRouteEnv>) => {
      const user = await currentUser(c)
      if (!user) return error(c, 401)
      return c.json({ data: await listMyApplications({ userId: user.id, repository: dependencies.repository }), error: null, meta: { requestId: c.get('requestId') } })
    },
    listForGame: async (c: Context<ApplicationsRouteEnv>) => {
      const user = await currentUser(c)
      if (!user) return error(c, 401)
      const gameId = requiredParam(c, 'id')
      if (!gameId) return error(c, 400)
      try {
        const applications = await listGameApplications({ gameId, ownerId: user.id, repository: dependencies.repository })
        return c.json({ data: applications, error: null, meta: { requestId: c.get('requestId') } })
      } catch (value) { return error(c, domainStatus(value)) }
    },
    decide: async (c: Context<ApplicationsRouteEnv>) => {
      const user = await currentUser(c)
      if (!user) return error(c, 401)
      if (!trustedOrigin(c)) return error(c, 403)
      const applicationId = requiredParam(c, 'id')
      if (!applicationId) return error(c, 400)
      const parsed = applicationDecisionSchema.safeParse(await c.req.json().catch(() => null))
      if (!parsed.success) return error(c, 400)
      try {
        const application = await decideApplication({ applicationId, ownerId: user.id, status: parsed.data.status, repository: dependencies.repository })
        return c.json({ data: application, error: null, meta: { requestId: c.get('requestId') } })
      } catch (value) { return error(c, domainStatus(value)) }
    },
  }
}

import type { Context } from 'hono'
import { readAccessToken } from '../auth/cookies.js'
import type { AuthConfig } from '../auth/config.js'
import type { AuthRepository } from '../auth/repository.js'
import { authenticateUser } from '../auth/services/authenticate-user.js'
import type { MemberRepository } from './repository.js'
import { listMembers } from './services/list-members.js'
import { removeMember } from './services/remove-member.js'

export type MembersDependencies = {
  authConfig: AuthConfig
  authRepository: AuthRepository
  repository: MemberRepository
  now?: () => Date
}

export type MemberRouteEnv = { Variables: { requestId: string } }

type ErrorStatus = 400 | 401 | 403 | 404 | 409 | 429 | 500

function error(c: Context<MemberRouteEnv>, status: ErrorStatus) {
  const message = status === 401
    ? 'Connectez-vous pour gérer le groupe.'
    : status === 500
      ? 'Une erreur interne est survenue. Réessayez plus tard.'
      : status === 429
        ? 'Trop de demandes. Réessayez dans quelques instants.'
        : status === 403
          ? 'Vous n’êtes pas autorisé à gérer ce groupe.'
          : status === 404
            ? 'Cette partie ou ce membre est introuvable.'
            : status === 409
              ? 'Ce membre ne peut pas être retiré.'
              : 'La demande de gestion du groupe est invalide.'
  return c.json({
    data: null,
    error: { code: status === 500 ? 'INTERNAL_ERROR' : 'MEMBER_ERROR', message },
    meta: { requestId: c.get('requestId') },
  }, status)
}

function domainStatus(value: unknown): 403 | 404 | 409 | 500 {
  if (!(value instanceof Error)) return 500
  if (value.message === 'MEMBER_FORBIDDEN') return 403
  if (value.message === 'MEMBER_NOT_FOUND') return 404
  if (value.message === 'MEMBER_CONFLICT') return 409
  return 500
}

function requiredParam(c: Context<MemberRouteEnv>, name: string): string | null {
  const value = c.req.param(name)
  return value && value.length > 0 ? value : null
}

export function createMemberHandlers(dependencies: MembersDependencies) {
  const now = dependencies.now ?? (() => new Date())
  const limits = new Map<string, { startedAt: number; count: number }>()

  function trustedOrigin(c: Context<MemberRouteEnv>): boolean {
    return c.req.header('origin') === dependencies.authConfig.appOrigin
  }

  function allowed(userId: string): boolean {
    const currentTime = Date.now()
    const current = limits.get(userId)
    if (!current || currentTime - current.startedAt >= 60_000) {
      limits.set(userId, { startedAt: currentTime, count: 1 })
      return true
    }
    if (current.count >= 30) return false
    current.count += 1
    return true
  }

  async function currentUser(c: Context<MemberRouteEnv>) {
    const token = readAccessToken(c)
    return token ? authenticateUser({ config: dependencies.authConfig, repository: dependencies.authRepository, token, now: now() }) : null
  }

  return {
    list: async (c: Context<MemberRouteEnv>) => {
      const user = await currentUser(c)
      if (!user) return error(c, 401)
      const gameId = requiredParam(c, 'gameId')
      if (!gameId) return error(c, 400)
      try {
        const members = await listMembers({ gameId, ownerId: user.id, repository: dependencies.repository })
        return c.json({ data: members, error: null, meta: { requestId: c.get('requestId') } })
      } catch (value) {
        return error(c, domainStatus(value))
      }
    },
    remove: async (c: Context<MemberRouteEnv>) => {
      const user = await currentUser(c)
      if (!user) return error(c, 401)
      if (!trustedOrigin(c)) return error(c, 403)
      if (!allowed(user.id)) return error(c, 429)
      const gameId = requiredParam(c, 'gameId')
      const userId = requiredParam(c, 'userId')
      if (!gameId || !userId) return error(c, 400)
      try {
        await removeMember({ gameId, ownerId: user.id, userId, repository: dependencies.repository, now })
        return c.body(null, 204)
      } catch (value) {
        return error(c, domainStatus(value))
      }
    },
  }
}

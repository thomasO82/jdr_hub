import type { Context } from 'hono'
import { invitationCommandSchema, invitationDecisionSchema } from '@jdr-hub/shared'
import { readAccessToken } from '../auth/cookies.js'
import type { AuthConfig } from '../auth/config.js'
import type { AuthRepository } from '../auth/repository.js'
import { authenticateUser } from '../auth/services/authenticate-user.js'
import type { InvitationRepository } from './repository.js'
import { createInvitation } from './services/create-invitation.js'
import { decideInvitation } from './services/decide-invitation.js'
import { listInvitations } from './services/list-invitations.js'

export type InvitationsDependencies = {
  authConfig: AuthConfig
  authRepository: AuthRepository
  repository: InvitationRepository
  now?: () => Date
}

export type InvitationRouteEnv = { Variables: { requestId: string } }

type ErrorStatus = 400 | 401 | 403 | 404 | 409 | 429 | 500

function error(c: Context<InvitationRouteEnv>, status: ErrorStatus) {
  const message = status === 401
    ? 'Connectez-vous pour gérer les invitations.'
    : status === 500
      ? 'Une erreur interne est survenue. Réessayez plus tard.'
      : status === 429
        ? 'Trop de demandes. Réessayez dans quelques instants.'
        : status === 403
          ? 'Vous n’êtes pas autorisé à gérer cette invitation.'
          : status === 404
            ? 'Cette invitation ou cette partie est introuvable.'
            : status === 409
              ? 'Cette invitation ne peut plus être traitée.'
              : 'La demande d’invitation est invalide.'
  return c.json({
    data: null,
    error: { code: status === 500 ? 'INTERNAL_ERROR' : 'INVITATION_ERROR', message },
    meta: { requestId: c.get('requestId') },
  }, status)
}

function domainStatus(value: unknown): 403 | 404 | 409 | 500 {
  if (!(value instanceof Error)) return 500
  if (value.message === 'INVITATION_FORBIDDEN') return 403
  if (value.message === 'INVITATION_NOT_FOUND') return 404
  if (value.message === 'INVITATION_CONFLICT') return 409
  return 500
}

function requiredParam(c: Context<InvitationRouteEnv>, name: string): string | null {
  const value = c.req.param(name)
  return value && value.length > 0 ? value : null
}

export function createInvitationHandlers(dependencies: InvitationsDependencies) {
  const now = dependencies.now ?? (() => new Date())
  const limits = new Map<string, { startedAt: number; count: number }>()

  function trustedOrigin(c: Context<InvitationRouteEnv>): boolean {
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

  async function currentUser(c: Context<InvitationRouteEnv>) {
    const token = readAccessToken(c)
    return token ? authenticateUser({ config: dependencies.authConfig, repository: dependencies.authRepository, token, now: now() }) : null
  }

  return {
    create: async (c: Context<InvitationRouteEnv>) => {
      const user = await currentUser(c)
      if (!user) return error(c, 401)
      if (!trustedOrigin(c)) return error(c, 403)
      if (!allowed(user.id)) return error(c, 429)
      const gameId = requiredParam(c, 'gameId')
      const parsed = await c.req.json().catch(() => null).then((body) => invitationCommandSchema.safeParse(body))
      if (!gameId || !parsed.success) return error(c, 400)
      try {
        const invitation = await createInvitation({ gameId, ownerId: user.id, inviteeId: parsed.data.inviteeId, repository: dependencies.repository, now })
        return c.json({ data: invitation, error: null, meta: { requestId: c.get('requestId') } }, 201)
      } catch (value) {
        return error(c, domainStatus(value))
      }
    },
    listMine: async (c: Context<InvitationRouteEnv>) => {
      const user = await currentUser(c)
      if (!user) return error(c, 401)
      try {
        const items = await listInvitations({ scope: 'INVITEE', userId: user.id, repository: dependencies.repository, now })
        return c.json({ data: { items }, error: null, meta: { requestId: c.get('requestId') } })
      } catch (value) {
        return error(c, domainStatus(value))
      }
    },
    listForGame: async (c: Context<InvitationRouteEnv>) => {
      const user = await currentUser(c)
      if (!user) return error(c, 401)
      const gameId = requiredParam(c, 'gameId')
      if (!gameId) return error(c, 400)
      try {
        const items = await listInvitations({ scope: 'OWNER', gameId, userId: user.id, repository: dependencies.repository, now })
        return c.json({ data: { items }, error: null, meta: { requestId: c.get('requestId') } })
      } catch (value) {
        return error(c, domainStatus(value))
      }
    },
    decide: async (c: Context<InvitationRouteEnv>) => {
      const user = await currentUser(c)
      if (!user) return error(c, 401)
      if (!trustedOrigin(c)) return error(c, 403)
      if (!allowed(user.id)) return error(c, 429)
      const invitationId = requiredParam(c, 'invitationId')
      const parsed = await c.req.json().catch(() => null).then((body) => invitationDecisionSchema.safeParse(body))
      if (!invitationId || !parsed.success) return error(c, 400)
      try {
        const invitation = await decideInvitation({ invitationId, userId: user.id, status: parsed.data.status, repository: dependencies.repository, now })
        return c.json({ data: invitation, error: null, meta: { requestId: c.get('requestId') } })
      } catch (value) {
        return error(c, domainStatus(value))
      }
    },
  }
}

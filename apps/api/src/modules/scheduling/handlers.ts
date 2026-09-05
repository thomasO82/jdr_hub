import type { Context } from 'hono'
import { fixedSessionInputSchema, planningQuerySchema, proposalInputSchema, sessionCommandSchema, voteCommandSchema } from '@jdr-hub/shared'
import { readAccessToken } from '../auth/cookies.js'
import type { AuthConfig } from '../auth/config.js'
import type { AuthRepository } from '../auth/repository.js'
import { authenticateUser } from '../auth/services/authenticate-user.js'
import type { SchedulingRepository } from './repository.js'
import { castVote } from './services/cast-vote.js'
import { createProposals } from './services/create-proposals.js'
import { createSession } from './services/create-session.js'
import { getPlanning } from './services/get-planning.js'
import { listProposals } from './services/list-proposals.js'
import { selectProposal } from './services/select-proposal.js'

export type SchedulingDependencies = {
  authConfig: AuthConfig
  authRepository: AuthRepository
  repository: SchedulingRepository
  now?: () => Date
}

export type SchedulingRouteEnv = { Variables: { requestId: string } }

function error(c: Context<SchedulingRouteEnv>, status: 400 | 401 | 403 | 404 | 409 | 429) {
  return c.json({ data: null, error: { code: 'SCHEDULING_ERROR', message: 'Scheduling request failed' }, meta: { requestId: c.get('requestId') } }, status)
}

function domainStatus(value: unknown): 400 | 403 | 404 | 409 {
  if (value instanceof Error && value.message === 'SCHEDULING_FORBIDDEN') return 403
  if (value instanceof Error && value.message === 'SCHEDULING_NOT_FOUND') return 404
  if (value instanceof Error && value.message === 'SCHEDULING_CONFLICT') return 409
  return 400
}

export function createSchedulingHandlers(dependencies: SchedulingDependencies) {
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
  async function currentUser(c: Context<SchedulingRouteEnv>) {
    const token = readAccessToken(c)
    return token ? authenticateUser({ config: dependencies.authConfig, repository: dependencies.authRepository, token, now: now() }) : null
  }
  const trustedOrigin = (c: Context<SchedulingRouteEnv>): boolean => c.req.header('origin') === dependencies.authConfig.appOrigin
  const required = (c: Context<SchedulingRouteEnv>, name: string): string | null => c.req.param(name) || null

  return {
    createProposals: async (c: Context<SchedulingRouteEnv>) => {
      const user = await currentUser(c)
      if (!user) return error(c, 401)
      if (!trustedOrigin(c)) return error(c, 403)
      if (!allowed(user.id)) return error(c, 429)
      const gameId = required(c, 'id')
      const parsed = proposalInputSchema.safeParse(await c.req.json().catch(() => null))
      if (!gameId || !parsed.success) return error(c, 400)
      try {
        const data = await createProposals({ gameId, ownerId: user.id, slots: parsed.data.slots, repository: dependencies.repository, now })
        return c.json({ data, error: null, meta: { requestId: c.get('requestId') } }, 201)
      } catch (value) { return error(c, domainStatus(value)) }
    },
    listProposals: async (c: Context<SchedulingRouteEnv>) => {
      const user = await currentUser(c)
      if (!user) return error(c, 401)
      const gameId = required(c, 'id')
      if (!gameId) return error(c, 400)
      try {
        const data = await listProposals({ gameId, userId: user.id, repository: dependencies.repository })
        return c.json({ data, error: null, meta: { requestId: c.get('requestId') } })
      } catch (value) { return error(c, domainStatus(value)) }
    },
    castVote: async (c: Context<SchedulingRouteEnv>) => {
      const user = await currentUser(c)
      if (!user) return error(c, 401)
      if (!trustedOrigin(c)) return error(c, 403)
      if (!allowed(user.id)) return error(c, 429)
      const proposalId = required(c, 'id')
      const parsed = voteCommandSchema.safeParse(await c.req.json().catch(() => null))
      if (!proposalId || !parsed.success) return error(c, 400)
      try {
        const data = await castVote({ proposalId, userId: user.id, vote: parsed.data.vote, repository: dependencies.repository, now })
        return c.json({ data, error: null, meta: { requestId: c.get('requestId') } })
      } catch (value) { return error(c, domainStatus(value)) }
    },
    createSession: async (c: Context<SchedulingRouteEnv>) => {
      const user = await currentUser(c)
      if (!user) return error(c, 401)
      if (!trustedOrigin(c)) return error(c, 403)
      if (!allowed(user.id)) return error(c, 429)
      const gameId = required(c, 'id')
      const parsed = sessionCommandSchema.safeParse(await c.req.json().catch(() => null))
      if (!gameId || !parsed.success) return error(c, 400)
      try {
        if ('proposalId' in parsed.data) {
          const data = await selectProposal({ gameId, ownerId: user.id, proposalId: parsed.data.proposalId, repository: dependencies.repository, now })
          return c.json({ data, error: null, meta: { requestId: c.get('requestId') } }, 201)
        }
        const fixed = fixedSessionInputSchema.parse(parsed.data)
        const data = await createSession({ gameId, ownerId: user.id, ...fixed, repository: dependencies.repository, now })
        return c.json({ data, error: null, meta: { requestId: c.get('requestId') } }, 201)
      } catch (value) { return error(c, domainStatus(value)) }
    },
    getPlanning: async (c: Context<SchedulingRouteEnv>) => {
      const user = await currentUser(c)
      if (!user) return error(c, 401)
      const parsed = planningQuerySchema.safeParse(c.req.query())
      if (!parsed.success) return error(c, 400)
      try {
        const data = await getPlanning({ userId: user.id, from: parsed.data.from ? new Date(parsed.data.from) : null, to: parsed.data.to ? new Date(parsed.data.to) : null, repository: dependencies.repository })
        return c.json({ data, error: null, meta: { requestId: c.get('requestId') } })
      } catch (value) { return error(c, domainStatus(value)) }
    },
  }
}


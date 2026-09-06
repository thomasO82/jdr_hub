import { Hono } from 'hono'
import { describe, expect, it } from 'vitest'
import { parseAuthConfig } from '../../../src/modules/auth/config.js'
import { createAccessToken } from '../../../src/modules/auth/services/access-token.js'
import { createSessionCredential } from '../../../src/modules/auth/services/session-service.js'
import { registerDashboardRoutes, type DashboardRouteEnv } from '../../../src/modules/dashboard/routes.js'
import { createInMemoryAuthRepository } from '../../helpers/in-memory-auth-repository.js'
import { createInMemoryDashboardRepository } from '../../helpers/in-memory-dashboard-repository.js'

const config = parseAuthConfig({
  APP_ORIGIN: 'http://localhost:18080',
  DISCORD_CLIENT_ID: '123456789012345678',
  DISCORD_CLIENT_SECRET: 'test-secret',
  DISCORD_REDIRECT_URI: 'http://localhost:18080/api/auth/discord/callback',
  JWT_SIGNING_SECRET: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
})
const now = new Date()

async function createTestApp() {
  const authRepository = createInMemoryAuthRepository()
  const owner = await authRepository.upsertDiscordUser({ discordId: 'discord-owner', username: 'MJ', avatarUrl: null }, now)
  const player = await authRepository.upsertDiscordUser({ discordId: 'discord-player', username: 'Joueur', avatarUrl: null }, now)
  const credentials = await Promise.all([owner, player].map(async (user, index) => {
    const credential = createSessionCredential({ now, randomBytes: () => new Uint8Array(32).fill(index + 1) })
    await authRepository.createSession(user.id, credential)
    const token = await createAccessToken({ config, now, sessionId: credential.id, userId: user.id })
    return { user, cookie: `jdr_hub_access=${token}` }
  }))
  const repository = createInMemoryDashboardRepository({ populated: true, userId: owner.id, ownerId: owner.id })
  const app = new Hono<DashboardRouteEnv>()
  app.use('*', async (c, next) => { c.set('requestId', 'test-request'); await next() })
  registerDashboardRoutes(app, { authConfig: config, authRepository, repository, now: () => now })
  return { app, owner: credentials[0]!, player: credentials[1]!, repository }
}

describe('dashboard API routes', () => {
  it('requires authentication and returns the authenticated dashboard projection', async () => {
    const { app, owner } = await createTestApp()
    expect((await app.request('/dashboard')).status).toBe(401)
    const response = await app.request('/dashboard?userId=another-user', { headers: { cookie: owner.cookie } })
    const payload = await response.json()
    expect(response.status).toBe(200)
    expect(payload).toMatchObject({ data: { user: { id: owner.user.id }, activeGames: { status: 'READY' } }, meta: { requestId: 'test-request' } })
  })

  it('exposes management only to the owner and does not trust a query user id', async () => {
    const { app, owner, player } = await createTestApp()
    expect((await app.request('/games/game-1/manage?userId=' + owner.user.id, { headers: { cookie: player.cookie } })).status).toBe(404)
    const response = await app.request('/games/00000000-0000-4000-8000-000000000010/manage', { headers: { cookie: owner.cookie } })
    expect(response.status).toBe(200)
    expect((await response.json()).data.game.role).toBe('GM')
  })

  it('keeps a partial source error localized and translates unexpected failures', async () => {
    const { app, owner, repository } = await createTestApp()
    repository.listInvitationSummary = async () => { throw new Error('database password') }
    const partial = await app.request('/dashboard', { headers: { cookie: owner.cookie } })
    const partialPayload = await partial.json()
    expect(partial.status).toBe(200)
    expect(partialPayload.data).toMatchObject({ nextSession: { status: 'READY' }, invitations: { status: 'ERROR', error: { code: 'DASHBOARD_SOURCE_ERROR' } } })
    repository.getUser = async () => { throw new Error('database password') }
    const response = await app.request('/dashboard', { headers: { cookie: owner.cookie } })
    const payload = await response.json()
    expect(response.status).toBe(500)
    expect(payload).toMatchObject({ error: { message: expect.stringContaining('Réessayez') }, meta: { requestId: 'test-request' } })
    expect(JSON.stringify(payload)).not.toContain('password')
  })
})

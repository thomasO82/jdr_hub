import { Hono } from 'hono'
import { describe, expect, it } from 'vitest'
import { parseAuthConfig } from '../../../src/modules/auth/config.js'
import { createAccessToken } from '../../../src/modules/auth/services/access-token.js'
import { createSessionCredential } from '../../../src/modules/auth/services/session-service.js'
import { registerDashboardRoutes, type DashboardRouteEnv } from '../../../src/modules/dashboard/routes.js'
import { createInMemoryAuthRepository } from '../../helpers/in-memory-auth-repository.js'
import { createInMemoryDashboardRepository } from '../../helpers/in-memory-dashboard-repository.js'
import { createInMemoryNotificationsRepository } from '../../helpers/in-memory-notifications-repository.js'

const config = parseAuthConfig({ APP_ORIGIN: 'http://localhost:18080', DISCORD_CLIENT_ID: '123456789012345678', DISCORD_CLIENT_SECRET: 'test-secret', DISCORD_REDIRECT_URI: 'http://localhost:18080/api/auth/discord/callback', JWT_SIGNING_SECRET: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' })
const now = new Date()

async function createTestApp() {
  const authRepository = createInMemoryAuthRepository()
  const user = await authRepository.upsertDiscordUser({ discordId: 'discord-owner', username: 'MJ', avatarUrl: null }, now)
  const credential = createSessionCredential({ now, randomBytes: () => new Uint8Array(32).fill(1) })
  await authRepository.createSession(user.id, credential)
  const token = await createAccessToken({ config, now, sessionId: credential.id, userId: user.id })
  const app = new Hono<DashboardRouteEnv>()
  app.use('*', async (c, next) => { c.set('requestId', 'test-request'); await next() })
  registerDashboardRoutes(app, {
    authConfig: config,
    authRepository,
    repository: createInMemoryDashboardRepository(),
    notificationsRepository: createInMemoryNotificationsRepository(),
    now: () => now,
  })
  return { app, cookie: `jdr_hub_access=${token}` }
}

describe('dashboard API routes', () => {
  it('returns 401 without a valid session', async () => {
    const { app } = await createTestApp()
    expect((await app.request('/dashboard')).status).toBe(401)
  })

  it('ignores a forged userId query parameter and uses the authenticated session', async () => {
    const { app, cookie } = await createTestApp()
    const response = await app.request('/dashboard?userId=other-user', { headers: { cookie } })

    expect(response.status).toBe(200)
    expect((await response.json()).data.notifications).toEqual({ status: 'EMPTY', data: null })
  })

  it('does not expose recipientId, actorId, Discord identifiers or delivery data', async () => {
    const { app, cookie } = await createTestApp()
    const body = await (await app.request('/dashboard', { headers: { cookie } })).json()

    expect(JSON.stringify(body)).not.toContain('recipientId')
    expect(JSON.stringify(body)).not.toContain('actorId')
    expect(JSON.stringify(body)).not.toContain('discord')
  })
})

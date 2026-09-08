import { Hono } from 'hono'
import { describe, expect, it } from 'vitest'
import { parseAuthConfig } from '../../../src/modules/auth/config.js'
import { createAccessToken } from '../../../src/modules/auth/services/access-token.js'
import { createSessionCredential } from '../../../src/modules/auth/services/session-service.js'
import { registerGamificationRoutes, type GamificationRouteEnv } from '../../../src/modules/gamification/routes.js'
import { createInMemoryAuthRepository } from '../../helpers/in-memory-auth-repository.js'
import { createInMemoryGamificationRepository } from '../../helpers/in-memory-gamification-repository.js'

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
  const user = await authRepository.upsertDiscordUser({ discordId: 'discord-xp-user', username: 'XP user', avatarUrl: null }, now)
  const credential = createSessionCredential({ now, randomBytes: () => new Uint8Array(32).fill(1) })
  await authRepository.createSession(user.id, credential)
  const token = await createAccessToken({ config, now, sessionId: credential.id, userId: user.id })
  const gamificationRepository = createInMemoryGamificationRepository({
    users: [user.id],
    events: [{
      id: 'event-1',
      userId: user.id,
      sessionId: 'session-1',
      amount: 100,
      reason: 'SESSION_ATTENDED',
      createdAt: now.toISOString(),
      idempotencyKey: 'session-attended:session-1:' + user.id,
    }],
  })
  const app = new Hono<GamificationRouteEnv>()
  app.use('*', async (c, next) => { c.set('requestId', 'test-request'); await next() })
  registerGamificationRoutes(app, { authConfig: config, authRepository, repository: gamificationRepository, now: () => now })
  return { app, cookie: `jdr_hub_access=${token}`, user }
}

describe('gamification API routes', () => {
  it('requires authentication and returns only the authenticated user history', async () => {
    const { app, cookie, user } = await createTestApp()
    expect((await app.request('/profile/xp')).status).toBe(401)

    const response = await app.request('/profile/xp?userId=forged-user', { headers: { cookie } })
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload).toMatchObject({
      data: {
        summary: { totalXp: 100, level: 1 },
        items: [{ id: 'event-1', sessionId: 'session-1', amount: 100, reason: 'SESSION_ATTENDED' }],
        nextCursor: null,
      },
      error: null,
      meta: { requestId: 'test-request' },
    })
    expect(payload.data.items[0]).not.toHaveProperty('userId')
    expect(payload.data.items[0]).not.toHaveProperty('idempotencyKey')
    expect(JSON.stringify(payload)).not.toContain(user.id)
  })

  it('rejects oversized limits and malformed cursors with a French client error', async () => {
    const { app, cookie } = await createTestApp()

    const oversized = await app.request('/profile/xp?limit=51', { headers: { cookie } })
    expect(oversized.status).toBe(400)
    expect((await oversized.json()).error.message).toContain('invalide')

    const malformedCursor = await app.request('/profile/xp?cursor=not-a-valid-cursor', { headers: { cookie } })
    expect(malformedCursor.status).toBe(400)
    expect((await malformedCursor.json()).error.message).toContain('invalide')
  })
})

import { Hono } from 'hono'
import { describe, expect, it } from 'vitest'
import { parseAuthConfig } from '../../../src/modules/auth/config.js'
import { createAccessToken } from '../../../src/modules/auth/services/access-token.js'
import { createSessionCredential } from '../../../src/modules/auth/services/session-service.js'
import { registerNotificationRoutes, type NotificationRouteEnv } from '../../../src/modules/notifications/routes.js'
import { createInMemoryAuthRepository } from '../../helpers/in-memory-auth-repository.js'
import { createInMemoryNotificationsRepository } from '../../helpers/in-memory-notifications-repository.js'

const config = parseAuthConfig({ APP_ORIGIN: 'http://localhost:18080', DISCORD_CLIENT_ID: '123456789012345678', DISCORD_CLIENT_SECRET: 'test-secret', DISCORD_REDIRECT_URI: 'http://localhost:18080/api/auth/discord/callback', JWT_SIGNING_SECRET: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' })
const now = new Date()

async function createTestApp() {
  const authRepository = createInMemoryAuthRepository()
  const user = await authRepository.upsertDiscordUser({ discordId: 'discord-owner', username: 'MJ', avatarUrl: null }, now)
  const credential = createSessionCredential({ now, randomBytes: () => new Uint8Array(32).fill(1) })
  await authRepository.createSession(user.id, credential)
  const token = await createAccessToken({ config, now, sessionId: credential.id, userId: user.id })
  const repository = createInMemoryNotificationsRepository({ notifications: [{ id: 'notification-1', type: 'ABSENCE_REPORTED', recipientId: user.id, gameId: 'game-1', sessionId: 'session-1', actorId: 'player-1', title: 'Absence signalée', body: 'Un joueur a signalé son absence pour une séance.', readAt: null, createdAt: now }] })
  const app = new Hono<NotificationRouteEnv>()
  app.use('*', async (c, next) => { c.set('requestId', 'test-request'); await next() })
  registerNotificationRoutes(app, { authConfig: config, authRepository, repository, now: () => now })
  return { app, cookie: `jdr_hub_access=${token}`, repository }
}

describe('notification API routes', () => {
  it('lists the authenticated user notifications with French-safe projections', async () => {
    const { app, cookie } = await createTestApp()
    expect((await app.request('/notifications')).status).toBe(401)
    const response = await app.request('/notifications?limit=20', { headers: { cookie } })
    expect(response.status).toBe(200)
    expect((await response.json()).data.items[0]).toMatchObject({ id: 'notification-1', readAt: null })
  })

  it('requires the trusted origin to mark a notification read and never reveals raw errors', async () => {
    const { app, cookie, repository } = await createTestApp()
    const invalidOrigin = await app.request('/notifications/notification-1/read', { method: 'POST', headers: { cookie, 'content-type': 'application/json' }, body: '{}' })
    expect(invalidOrigin.status).toBe(403)
    const response = await app.request('/notifications/notification-1/read', { method: 'POST', headers: { cookie, origin: config.appOrigin, 'content-type': 'application/json' }, body: '{}' })
    expect(response.status).toBe(204)
    expect(repository.notifications[0]?.readAt).toEqual(now)
  })

  it('validates pagination bounds and unknown payload properties', async () => {
    const { app, cookie } = await createTestApp()
    expect((await app.request('/notifications?limit=0', { headers: { cookie } })).status).toBe(400)
    const response = await app.request('/notifications/notification-1/read', { method: 'POST', headers: { cookie, origin: config.appOrigin, 'content-type': 'application/json' }, body: JSON.stringify({ reason: 'unexpected' }) })
    expect(response.status).toBe(400)
  })
})

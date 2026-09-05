import { Hono } from 'hono'
import { describe, expect, it } from 'vitest'
import { parseAuthConfig } from '../../../src/modules/auth/config.js'
import { createInMemoryAuthRepository } from '../../helpers/in-memory-auth-repository.js'
import { createAccessToken } from '../../../src/modules/auth/services/access-token.js'
import { createSessionCredential } from '../../../src/modules/auth/services/session-service.js'
import { createInMemoryAvailabilityRepository } from '../../helpers/in-memory-availability-repository.js'
import { registerAvailabilityRoutes, type AvailabilityRouteEnv } from '../../../src/modules/availability/routes.js'

const config = parseAuthConfig({
  APP_ORIGIN: 'http://localhost:18080', DISCORD_CLIENT_ID: '123456789012345678',
  DISCORD_CLIENT_SECRET: 'test-secret', DISCORD_REDIRECT_URI: 'http://localhost:18080/api/auth/discord/callback',
  JWT_SIGNING_SECRET: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
})
const now = new Date()

async function createTestApp() {
  const authRepository = createInMemoryAuthRepository()
  const user = await authRepository.upsertDiscordUser({ discordId: 'discord-player-1', username: 'Player', avatarUrl: null }, now)
  const credential = createSessionCredential({ now, randomBytes: () => new Uint8Array(32).fill(7) })
  await authRepository.createSession(user.id, credential)
  const token = await createAccessToken({ config, now, sessionId: credential.id, userId: user.id })
  const availabilityRepository = createInMemoryAvailabilityRepository({ snapshots: [{ userId: user.id, username: user.username, avatarUrl: user.avatarUrl, level: null, timezone: user.timezone, rules: [], exceptions: [], preferences: { availabilityPublic: false, invitationNotifications: true, experienceLevel: null }, preferredSystems: [] }] })
  const app = new Hono<AvailabilityRouteEnv>()
  app.use('*', async (c, next) => { c.set('requestId', 'test-request'); await next() })
  registerAvailabilityRoutes(app, { authConfig: config, authRepository, repository: availabilityRepository, now: () => now })
  return { app, cookie: `jdr_hub_access=${token}`, availabilityRepository }
}

describe('availability API routes', () => {
  it('requires authentication', async () => {
    const { app } = await createTestApp()
    expect((await app.request('/availability')).status).toBe(401)
    expect((await app.request('/players')).status).toBe(401)
  })

  it('reads and replaces the private availability snapshot with a trusted origin', async () => {
    const { app, cookie } = await createTestApp()
    const payload = { timezone: 'Europe/Paris', rules: [], exceptions: [], preferences: { availabilityPublic: false, invitationNotifications: true, experienceLevel: null }, preferredSystems: [] }
    const headers = { cookie, origin: config.appOrigin, 'content-type': 'application/json' }
    const saved = await app.request('/availability', { method: 'PUT', headers, body: JSON.stringify(payload) })
    expect(saved.status).toBe(200)
    expect((await app.request('/availability', { headers: { cookie } })).status).toBe(200)
    expect((await app.request('/availability', { method: 'PUT', headers: { ...headers, origin: 'http://attacker.test' }, body: JSON.stringify(payload) })).status).toBe(403)
  })

  it('rejects unknown body properties and returns a generic domain error', async () => {
    const { app, cookie } = await createTestApp()
    const headers = { cookie, origin: config.appOrigin, 'content-type': 'application/json' }
    expect((await app.request('/availability', { method: 'PUT', headers, body: JSON.stringify({ timezone: 'Bad/Zone', rules: [], exceptions: [], preferences: {}, preferredSystems: [], unexpected: true }) })).status).toBe(400)
    expect((await app.request('/availability', { method: 'PUT', headers, body: JSON.stringify({ timezone: 'Bad/Zone', rules: [], exceptions: [], preferences: {}, preferredSystems: [] }) })).status).toBe(400)
  })

  it('returns sanitized player summaries and bounded filters', async () => {
    const { app, cookie, availabilityRepository } = await createTestApp()
    const result = await app.request('/players?q=pla&page=1&pageSize=20', { headers: { cookie } })
    expect(result.status).toBe(200)
    expect((await result.json()).data.items[0]).not.toHaveProperty('rules')
    expect(availabilityRepository.replacements).toHaveLength(0)
  })

  it('limits repeated availability writes for the authenticated user', async () => {
    const { app, cookie } = await createTestApp()
    const headers = { cookie, origin: config.appOrigin, 'content-type': 'application/json' }
    const payload = { timezone: 'Europe/Paris', rules: [], exceptions: [], preferences: { availabilityPublic: false, invitationNotifications: true, experienceLevel: null }, preferredSystems: [] }
    const statuses: number[] = []
    for (let attempt = 0; attempt < 21; attempt += 1) {
      statuses.push((await app.request('/availability', { method: 'PUT', headers, body: JSON.stringify(payload) })).status)
    }
    expect(statuses.slice(0, 20).every((status) => status === 200)).toBe(true)
    expect(statuses[20]).toBe(429)
  })
})

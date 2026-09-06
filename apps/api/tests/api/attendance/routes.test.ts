import { Hono } from 'hono'
import { describe, expect, it } from 'vitest'
import { parseAuthConfig } from '../../../src/modules/auth/config.js'
import { createAccessToken } from '../../../src/modules/auth/services/access-token.js'
import { createSessionCredential } from '../../../src/modules/auth/services/session-service.js'
import { registerAttendanceRoutes, type AttendanceRouteEnv } from '../../../src/modules/attendance/routes.js'
import { createInMemoryAttendanceRepository } from '../../helpers/in-memory-attendance-repository.js'
import { createInMemoryAuthRepository } from '../../helpers/in-memory-auth-repository.js'

const config = parseAuthConfig({ APP_ORIGIN: 'http://localhost:18080', DISCORD_CLIENT_ID: '123456789012345678', DISCORD_CLIENT_SECRET: 'test-secret', DISCORD_REDIRECT_URI: 'http://localhost:18080/api/auth/discord/callback', JWT_SIGNING_SECRET: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' })
const now = new Date()

async function createTestApp() {
  const authRepository = createInMemoryAuthRepository()
  const owner = await authRepository.upsertDiscordUser({ discordId: 'discord-owner', username: 'MJ', avatarUrl: null }, now)
  const member = await authRepository.upsertDiscordUser({ discordId: 'discord-member', username: 'Joueur', avatarUrl: null }, now)
  const outsider = await authRepository.upsertDiscordUser({ discordId: 'discord-outsider', username: 'Exterieur', avatarUrl: null }, now)
  const credentials = await Promise.all([owner, member, outsider].map(async (user, index) => {
    const credential = createSessionCredential({ now, randomBytes: () => new Uint8Array(32).fill(index + 1) })
    await authRepository.createSession(user.id, credential)
  const token = await createAccessToken({ config, now, sessionId: credential.id, userId: user.id })
    return { user, cookie: `jdr_hub_access=${token}` }
  }))
  const repository = createInMemoryAttendanceRepository({ sessions: [{
    sessionId: 'session-1', gameId: 'game-1', gameTitle: 'La crypte', sessionStartsAt: new Date('2026-09-10T18:00:00.000Z'), ownerId: owner.id,
    gameStatus: 'ACTIVE', sessionStatus: 'SCHEDULED', ownerDiscordId: '100000000000000001', memberDiscordId: '100000000000000002', memberStatuses: { [member.id]: 'ACTIVE' },
  }] })
  const app = new Hono<AttendanceRouteEnv>()
  app.use('*', async (c, next) => { c.set('requestId', 'test-request'); await next() })
  registerAttendanceRoutes(app, { authConfig: config, authRepository, repository, now: () => now })
  return { app, owner: credentials[0]!, member: credentials[1]!, outsider: credentials[2]!, repository }
}

describe('attendance API routes', () => {
  it('requires authentication, trusted origin and a strict empty absence payload', async () => {
    const { app, member, repository } = await createTestApp()
    expect((await app.request('/sessions/session-1/absence', { method: 'POST', body: '{}' })).status).toBe(401)
    expect((await app.request('/sessions/session-1/absence', { method: 'POST', headers: { cookie: member.cookie, 'content-type': 'application/json' }, body: '{}' })).status).toBe(403)
    const invalid = await app.request('/sessions/session-1/absence', { method: 'POST', headers: { cookie: member.cookie, origin: config.appOrigin, 'content-type': 'application/json' }, body: JSON.stringify({ reason: 'privé' }) })
    expect(invalid.status).toBe(400)
    expect(repository.attendance).toHaveLength(0)
  })

  it('reports an absence for an active member without exposing Discord data', async () => {
    const { app, member } = await createTestApp()
    const response = await app.request('/sessions/session-1/absence', { method: 'POST', headers: { cookie: member.cookie, origin: config.appOrigin, 'content-type': 'application/json' }, body: '{}' })
    expect(response.status).toBe(201)
    const body = await response.json()
    expect(body.data.attendance).toMatchObject({ status: 'EXCUSED', userId: member.user.id })
    expect(JSON.stringify(body)).not.toContain('discord')
  })

  it('rejects outsiders and lets only the owner validate attendance', async () => {
    const { app, owner, member, outsider } = await createTestApp()
    const headers = { origin: config.appOrigin, 'content-type': 'application/json' }
    const outsiderResponse = await app.request('/sessions/session-1/absence', { method: 'POST', headers: { ...headers, cookie: outsider.cookie }, body: '{}' })
    expect(outsiderResponse.status).toBe(403)
    const memberResponse = await app.request('/sessions/session-1/attendance', { method: 'POST', headers: { ...headers, cookie: member.cookie }, body: JSON.stringify({ entries: [{ userId: member.user.id, status: 'PRESENT' }] }) })
    expect(memberResponse.status).toBe(403)
    const ownerResponse = await app.request('/sessions/session-1/attendance', { method: 'POST', headers: { ...headers, cookie: owner.cookie }, body: JSON.stringify({ entries: [{ userId: member.user.id, status: 'PRESENT' }] }) })
    expect(ownerResponse.status).toBe(200)
  })
})

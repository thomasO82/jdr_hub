import { Hono } from 'hono'
import { describe, expect, it } from 'vitest'
import { parseAuthConfig } from '../../../src/modules/auth/config.js'
import { createAccessToken } from '../../../src/modules/auth/services/access-token.js'
import { createSessionCredential } from '../../../src/modules/auth/services/session-service.js'
import { registerInvitationRoutes, type InvitationRouteEnv } from '../../../src/modules/invitations/routes.js'
import { createInMemoryAuthRepository } from '../../helpers/in-memory-auth-repository.js'
import { createInMemoryInvitationsRepository } from '../../helpers/in-memory-invitations-repository.js'

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
  const users = await Promise.all([
    authRepository.upsertDiscordUser({ discordId: 'discord-owner', username: 'MJ', avatarUrl: null }, now),
    authRepository.upsertDiscordUser({ discordId: 'discord-player', username: 'Joueur', avatarUrl: null }, now),
    authRepository.upsertDiscordUser({ discordId: 'discord-other', username: 'Autre', avatarUrl: null }, now),
  ])
  const credentials = await Promise.all(users.map(async (user, index) => {
    const credential = createSessionCredential({ now, randomBytes: () => new Uint8Array(32).fill(index + 1) })
    await authRepository.createSession(user.id, credential)
    const token = await createAccessToken({ config, now, sessionId: credential.id, userId: user.id })
    return { user, cookie: `jdr_hub_access=${token}` }
  }))
  const repository = createInMemoryInvitationsRepository({
    games: [{ id: 'game-1', ownerId: users[0]!.id, title: 'La crypte', status: 'OPEN', maxPlayers: 2 }],
    activeMembers: [{ gameId: 'game-1', userId: users[0]!.id }],
  })
  const app = new Hono<InvitationRouteEnv>()
  app.use('*', async (c, next) => { c.set('requestId', 'test-request'); await next() })
  registerInvitationRoutes(app, { authConfig: config, authRepository, repository, now: () => now })
  return { app, owner: credentials[0]!, player: credentials[1]!, other: credentials[2]!, repository }
}

const trustedJson = (cookie: string) => ({ cookie, origin: config.appOrigin, 'content-type': 'application/json' })

describe('invitations API routes', () => {
  it('requires authentication and a trusted origin to create or decide an invitation', async () => {
    const { app, player } = await createTestApp()
    expect((await app.request('/games/game-1/invitations', { method: 'POST', body: '{}' })).status).toBe(401)
    expect((await app.request('/games/game-1/invitations', { method: 'POST', headers: { cookie: player.cookie, 'content-type': 'application/json' }, body: '{}' })).status).toBe(403)
    expect((await app.request('/invitations/unknown', { method: 'PATCH', headers: { cookie: player.cookie, 'content-type': 'application/json' }, body: JSON.stringify({ status: 'REJECTED' }) })).status).toBe(403)
  })

  it('creates a strict invitation from the owner and protects server-controlled fields', async () => {
    const { app, owner, player } = await createTestApp()
    const headers = trustedJson(owner.cookie)
    const invalid = await app.request('/games/game-1/invitations', { method: 'POST', headers, body: JSON.stringify({ inviteeId: player.user.id, expiresAt: '2030-01-01T00:00:00.000Z' }) })
    expect(invalid.status).toBe(400)
    const created = await app.request('/games/game-1/invitations', { method: 'POST', headers, body: JSON.stringify({ inviteeId: player.user.id }) })
    expect(created.status).toBe(201)
    expect((await created.json()).data).toMatchObject({ gameId: 'game-1', inviterId: owner.user.id, inviteeId: player.user.id, status: 'PENDING', expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60_000).toISOString() })
    expect((await app.request('/games/game-1/invitations', { method: 'POST', headers, body: JSON.stringify({ inviteeId: player.user.id }) })).status).toBe(409)
  })

  it('scopes listing to the invitee or game owner', async () => {
    const { app, owner, player, other } = await createTestApp()
    const created = await app.request('/games/game-1/invitations', { method: 'POST', headers: trustedJson(owner.cookie), body: JSON.stringify({ inviteeId: player.user.id }) })
    const invitationId = (await created.json()).data.id as string
    expect((await app.request('/invitations', { headers: { cookie: player.cookie } })).status).toBe(200)
    expect((await app.request('/games/game-1/invitations', { headers: { cookie: owner.cookie } })).status).toBe(200)
    expect((await app.request('/games/game-1/invitations', { headers: { cookie: player.cookie } })).status).toBe(403)
    expect((await app.request('/invitations', { headers: { cookie: other.cookie } })).status).toBe(200)
    expect(invitationId).toEqual(expect.any(String))
  })

  it('lets the invitee accept and the owner cancel, with origin protection', async () => {
    const { app, owner, player } = await createTestApp()
    const created = await app.request('/games/game-1/invitations', { method: 'POST', headers: trustedJson(owner.cookie), body: JSON.stringify({ inviteeId: player.user.id }) })
    const invitationId = (await created.json()).data.id as string
    const withoutOrigin = await app.request(`/invitations/${invitationId}`, { method: 'PATCH', headers: { cookie: player.cookie, 'content-type': 'application/json' }, body: JSON.stringify({ status: 'ACCEPTED' }) })
    expect(withoutOrigin.status).toBe(403)
    const accepted = await app.request(`/invitations/${invitationId}`, { method: 'PATCH', headers: trustedJson(player.cookie), body: JSON.stringify({ status: 'ACCEPTED' }) })
    expect(accepted.status).toBe(200)
    expect((await accepted.json()).data.status).toBe('ACCEPTED')
    expect((await app.request(`/invitations/${invitationId}`, { method: 'PATCH', headers: trustedJson(owner.cookie), body: JSON.stringify({ status: 'CANCELLED' }) })).status).toBe(409)
  })

  it('rejects forged decisions and translates persistence failures', async () => {
    const { app, owner, player, repository } = await createTestApp()
    const invalid = await app.request('/invitations/unknown', { method: 'PATCH', headers: trustedJson(player.cookie), body: JSON.stringify({ status: 'ACCEPTED', userId: owner.user.id }) })
    expect(invalid.status).toBe(400)
    repository.listForInvitee = async () => { throw new Error('database password') }
    const response = await app.request('/invitations', { headers: { cookie: player.cookie } })
    const payload = await response.json()
    expect(response.status).toBe(500)
    expect(payload).toMatchObject({ error: { message: expect.stringContaining('Réessayez') }, meta: { requestId: 'test-request' } })
    expect(JSON.stringify(payload)).not.toContain('password')
  })
})

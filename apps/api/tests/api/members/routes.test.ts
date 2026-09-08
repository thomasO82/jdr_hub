import { Hono } from 'hono'
import { describe, expect, it } from 'vitest'
import { parseAuthConfig } from '../../../src/modules/auth/config.js'
import { createAccessToken } from '../../../src/modules/auth/services/access-token.js'
import { createSessionCredential } from '../../../src/modules/auth/services/session-service.js'
import { registerMemberRoutes, type MemberRouteEnv } from '../../../src/modules/members/routes.js'
import { createInMemoryAuthRepository } from '../../helpers/in-memory-auth-repository.js'
import { createInMemoryMembersRepository } from '../../helpers/in-memory-members-repository.js'

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
  const repository = createInMemoryMembersRepository({
    games: [{ id: 'game-1', ownerId: users[0]!.id }],
    members: [
      { gameId: 'game-1', userId: users[0]!.id, username: 'MJ', avatarUrl: null, role: 'GM', status: 'ACTIVE', joinedAt: now },
      { gameId: 'game-1', userId: users[1]!.id, username: 'Joueur', avatarUrl: null, role: 'PLAYER', status: 'ACTIVE', joinedAt: now },
    ],
  })
  const app = new Hono<MemberRouteEnv>()
  app.use('*', async (c, next) => { c.set('requestId', 'test-request'); await next() })
  registerMemberRoutes(app, { authConfig: config, authRepository, repository, now: () => now })
  return { app, owner: credentials[0]!, player: credentials[1]!, other: credentials[2]!, repository }
}

describe('members API routes', () => {
  it('requires authentication and owner authorization for roster reads', async () => {
    const { app, owner, player } = await createTestApp()
    expect((await app.request('/games/game-1/members')).status).toBe(401)
    expect((await app.request('/games/game-1/members', { headers: { cookie: player.cookie } })).status).toBe(403)
    const response = await app.request('/games/game-1/members', { headers: { cookie: owner.cookie } })
    expect(response.status).toBe(200)
    expect((await response.json()).data[1]).toMatchObject({ role: 'PLAYER', status: 'ACTIVE' })
  })

  it('requires a trusted origin and removes a player without allowing GM removal', async () => {
    const { app, owner, player } = await createTestApp()
    const withoutOrigin = await app.request(`/games/game-1/members/${player.user.id}`, { method: 'DELETE', headers: { cookie: owner.cookie } })
    expect(withoutOrigin.status).toBe(403)
    const removed = await app.request(`/games/game-1/members/${player.user.id}`, { method: 'DELETE', headers: { cookie: owner.cookie, origin: config.appOrigin } })
    expect(removed.status).toBe(204)
    await expect((await app.request('/games/game-1/members', { headers: { cookie: owner.cookie } })).json()).resolves.toMatchObject({ data: [{ role: 'GM' }] })
    expect((await app.request(`/games/game-1/members/${owner.user.id}`, { method: 'DELETE', headers: { cookie: owner.cookie, origin: config.appOrigin } })).status).toBe(409)
  })

  it('rejects non-owner mutation and translates repository errors', async () => {
    const { app, owner, player, repository } = await createTestApp()
    expect((await app.request(`/games/game-1/members/${player.user.id}`, { method: 'DELETE', headers: { cookie: player.cookie, origin: config.appOrigin } })).status).toBe(403)
    repository.listForOwner = async () => { throw new Error('database password') }
    const response = await app.request('/games/game-1/members', { headers: { cookie: owner.cookie } })
    const payload = await response.json()
    expect(response.status).toBe(500)
    expect(payload).toMatchObject({ error: { message: expect.stringContaining('Réessayez') }, meta: { requestId: 'test-request' } })
    expect(JSON.stringify(payload)).not.toContain('password')
  })
})

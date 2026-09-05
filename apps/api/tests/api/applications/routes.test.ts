import { Hono } from 'hono'
import { describe, expect, it } from 'vitest'
import { parseAuthConfig } from '../../../src/modules/auth/config.js'
import { createAccessToken } from '../../../src/modules/auth/services/access-token.js'
import { createSessionCredential } from '../../../src/modules/auth/services/session-service.js'
import { createInMemoryAuthRepository } from '../../helpers/in-memory-auth-repository.js'
import { createInMemoryApplicationsRepository } from '../../helpers/in-memory-applications-repository.js'
import { registerApplicationRoutes, type ApplicationsRouteEnv } from '../../../src/modules/applications/routes.js'

const config = parseAuthConfig({
  APP_ORIGIN: 'http://localhost:18080', DISCORD_CLIENT_ID: '123456789012345678',
  DISCORD_CLIENT_SECRET: 'test-secret', DISCORD_REDIRECT_URI: 'http://localhost:18080/api/auth/discord/callback',
  JWT_SIGNING_SECRET: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
})
const now = new Date()

async function authenticatedUser(authRepository: ReturnType<typeof createInMemoryAuthRepository>, username: string) {
  const user = await authRepository.upsertDiscordUser({ discordId: `${username}-discord`, username, avatarUrl: null }, now)
  const credential = createSessionCredential({ now, randomBytes: () => new Uint8Array(32).fill(username === 'MJ' ? 3 : 4) })
  await authRepository.createSession(user.id, credential)
  const token = await createAccessToken({ config, now, sessionId: credential.id, userId: user.id })
  return { user, cookie: `jdr_hub_access=${token}` }
}

async function createTestApp() {
  const authRepository = createInMemoryAuthRepository()
  const owner = await authenticatedUser(authRepository, 'MJ')
  const player = await authenticatedUser(authRepository, 'Joueur')
  const applications = createInMemoryApplicationsRepository({ games: [{ id: 'game-1', ownerId: owner.user.id, visibility: 'PUBLIC', status: 'OPEN', maxPlayers: 2 }] })
  const app = new Hono<ApplicationsRouteEnv>()
  app.use('*', async (c, next) => { c.set('requestId', 'test-request'); await next() })
  registerApplicationRoutes(app, { authConfig: config, authRepository, repository: applications, now: () => now })
  return { app, owner, player }
}

describe('applications API routes', () => {
  it('requires authentication and a trusted origin to submit', async () => {
    const { app, player } = await createTestApp()
    expect((await app.request('/games/game-1/applications', { method: 'POST', body: '{}' })).status).toBe(401)
    expect((await app.request('/games/game-1/applications', { method: 'POST', headers: { cookie: player.cookie, 'content-type': 'application/json' }, body: '{}' })).status).toBe(403)
  })

  it('creates a candidature, returns its status and rejects duplicates or forged fields', async () => {
    const { app, player } = await createTestApp()
    const headers = { cookie: player.cookie, origin: config.appOrigin, 'content-type': 'application/json' }
    const created = await app.request('/games/game-1/applications', { method: 'POST', headers, body: JSON.stringify({ message: 'Disponible le jeudi.' }) })
    expect(created.status).toBe(201)
    expect((await created.json()).data).toMatchObject({ status: 'PENDING', userId: player.user.id })
    expect((await app.request('/applications', { headers: { cookie: player.cookie } })).status).toBe(200)
    expect((await app.request('/games/game-1/applications', { method: 'POST', headers, body: JSON.stringify({ userId: 'forged' }) })).status).toBe(400)
    expect((await app.request('/games/game-1/applications', { method: 'POST', headers, body: '{}' })).status).toBe(409)
  })

  it('lets only the game owner list and decide applications', async () => {
    const { app, owner, player } = await createTestApp()
    const headers = { cookie: player.cookie, origin: config.appOrigin, 'content-type': 'application/json' }
    const created = await app.request('/games/game-1/applications', { method: 'POST', headers, body: '{}' })
    const applicationId = (await created.json()).data.id as string
    expect((await app.request('/games/game-1/applications', { headers: { cookie: player.cookie } })).status).toBe(403)
    expect((await app.request('/games/game-1/applications', { headers: { cookie: owner.cookie } })).status).toBe(200)
    const decision = await app.request(`/applications/${applicationId}`, { method: 'PATCH', headers: { ...headers, cookie: owner.cookie }, body: JSON.stringify({ status: 'ACCEPTED' }) })
    expect(decision.status).toBe(200)
  })
})

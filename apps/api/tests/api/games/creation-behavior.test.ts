import { Hono } from 'hono'
import { describe, expect, it } from 'vitest'
import { parseAuthConfig } from '../../../src/modules/auth/config.js'
import { registerAuthRoutes, type AuthRouteEnv } from '../../../src/modules/auth/routes.js'
import { createInMemoryAuthRepository } from '../../helpers/in-memory-auth-repository.js'
import { createInMemoryGamesRepository } from '../../helpers/in-memory-games-repository.js'
import { registerGamesRoutes, type GamesRouteEnv } from '../../../src/modules/games/routes.js'

const config = parseAuthConfig({
  APP_ORIGIN: 'https://jdr-hub.example.test',
  DISCORD_CLIENT_ID: '123456789012345678',
  DISCORD_CLIENT_SECRET: 'test-only-client-secret',
  DISCORD_REDIRECT_URI: 'https://jdr-hub.example.test/api/auth/discord/callback',
  JWT_SIGNING_SECRET: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  NODE_ENV: 'production',
})

async function createAuthenticatedApp(options: { rejectTags?: boolean } = {}) {
  const app = new Hono<GamesRouteEnv & AuthRouteEnv>()
  app.use('*', async (c, next) => {
    c.set('requestId', 'test-request-id')
    await next()
  })
  const authRepository = createInMemoryAuthRepository()
  const gamesRepository = createInMemoryGamesRepository()
  let identity = { discordId: '123456789012345678', username: 'MJ fictif', avatarUrl: null as string | null }
  if (options.rejectTags) {
    gamesRepository.create = async () => { throw new Error('GAME_TAG_INVALID') }
  }
  registerAuthRoutes(app, {
    config,
    repository: authRepository,
    fetchDiscordIdentity: async () => identity,
  })
  registerGamesRoutes(app, { authConfig: config, authRepository, repository: gamesRepository })

  async function loginAs(user: typeof identity) {
    identity = user
    const start = await app.request('/auth/discord')
    const state = new URL(start.headers.get('location')!).searchParams.get('state')!
    const callback = await app.request(`/auth/discord/callback?code=test-code&state=${state}`)
    return callback.headers.getSetCookie().find((cookie) => cookie.startsWith('jdr_hub_access='))!.split(';', 1)[0]!
  }

  const accessCookie = await loginAs(identity)
  const otherAccessCookie = await loginAs({ discordId: '987654321098765432', username: 'Joueur fictif', avatarUrl: null })
  return { app, accessCookie, otherAccessCookie }
}

const validGame = {
  title: 'La Crypte',
  system: 'D&D',
  description: 'Une aventure de test.',
  type: 'ONE_SHOT',
  maxPlayers: 4,
  visibility: 'PUBLIC',
  tags: [],
}

describe('game creation behavior', () => {
  it('rejects creation when no session cookie is sent', async () => {
    const { app } = await createAuthenticatedApp()
    const response = await app.request('/games', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(validGame),
    })

    expect(response.status).toBe(401)
    expect((await response.json()).error.code).toBe('AUTH_ERROR')
  })

  it('creates a public game directly in the open state so it appears in discovery', async () => {
    const { app, accessCookie } = await createAuthenticatedApp()
    const response = await app.request('/games', {
      method: 'POST',
      headers: { cookie: accessCookie, origin: config.appOrigin, 'content-type': 'application/json' },
      body: JSON.stringify(validGame),
    })

    expect(response.status).toBe(201)
    const created = (await response.json()).data
    expect(created.status).toBe('OPEN')

    const catalogue = await app.request('/public/games')
    expect((await catalogue.json()).data.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ slug: created.slug, title: validGame.title }),
    ]))
  })

  it('reports an unavailable tag as invalid input instead of an authentication error', async () => {
    const { app, accessCookie } = await createAuthenticatedApp({ rejectTags: true })
    const response = await app.request('/games', {
      method: 'POST',
      headers: { cookie: accessCookie, origin: config.appOrigin, 'content-type': 'application/json' },
      body: JSON.stringify({ ...validGame, tags: ['tag-inexistant'] }),
    })

    expect(response.status).toBe(400)
    expect((await response.json()).error.code).toBe('INVALID_GAME_TAG')
  })

  it('rejects a game creation from an untrusted origin', async () => {
    const { app, accessCookie } = await createAuthenticatedApp()
    const response = await app.request('/games', {
      method: 'POST',
      headers: { cookie: accessCookie, origin: 'https://attacker.example.test', 'content-type': 'application/json' },
      body: JSON.stringify(validGame),
    })

    expect(response.status).toBe(403)
  })

  it('requires an owner session to read a game by internal id', async () => {
    const { app, accessCookie, otherAccessCookie } = await createAuthenticatedApp()
    const created = await app.request('/games', {
      method: 'POST',
      headers: { cookie: accessCookie, origin: config.appOrigin, 'content-type': 'application/json' },
      body: JSON.stringify(validGame),
    })
    const gameId = (await created.json()).data.id as string

    expect((await app.request(`/games/${gameId}`)).status).toBe(401)
    expect((await app.request(`/games/${gameId}`, { headers: { cookie: accessCookie } })).status).toBe(200)
    expect((await app.request(`/games/${gameId}`, { headers: { cookie: otherAccessCookie } })).status).toBe(404)
  })
})

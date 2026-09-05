import { Hono } from 'hono'
import { describe, expect, it } from 'vitest'
import { parseAuthConfig } from '../../../src/modules/auth/config.js'
import { createInMemoryAuthRepository } from '../../helpers/in-memory-auth-repository.js'
import { createInMemoryGamesRepository } from '../../helpers/in-memory-games-repository.js'
import { registerGamesRoutes, type GamesRouteEnv } from '../../../src/modules/games/routes.js'

const config = parseAuthConfig({
  APP_ORIGIN: 'http://localhost:18080', DISCORD_CLIENT_ID: '123456789012345678',
  DISCORD_CLIENT_SECRET: 'test-secret', DISCORD_REDIRECT_URI: 'http://localhost:18080/api/auth/discord/callback',
  JWT_SIGNING_SECRET: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
})

describe('games API routes', () => {
  it('lists only public open games and active tags', async () => {
    const app = new Hono<GamesRouteEnv>()
    registerGamesRoutes(app, { authConfig: config, authRepository: createInMemoryAuthRepository(), repository: createInMemoryGamesRepository([
      { id: 'game-1', ownerId: 'owner', slug: 'crypte', title: 'La Crypte', system: 'D&D', description: 'Desc', type: 'ONE_SHOT', status: 'OPEN', visibility: 'PUBLIC', maxPlayers: 4, tags: ['horror'] },
      { id: 'game-2', ownerId: 'owner', slug: 'privee', title: 'Privée', system: 'D&D', description: 'Desc', type: 'CAMPAIGN', status: 'OPEN', visibility: 'PRIVATE', maxPlayers: 4, tags: [] },
    ]) })
    const response = await app.request('/games?q=crypte')
    expect(response.status).toBe(200)
    expect((await response.json()).data.items).toHaveLength(1)
    expect((await app.request('/tags')).status).toBe(200)
  })

  it('rejects malformed pagination before repository access', async () => {
    const app = new Hono<GamesRouteEnv>()
    registerGamesRoutes(app, { authConfig: config, authRepository: createInMemoryAuthRepository(), repository: createInMemoryGamesRepository() })
    expect((await app.request('/games?page=0')).status).toBe(400)
  })

  it('serves public open games by slug and hides private games', async () => {
    const app = new Hono<GamesRouteEnv>()
    registerGamesRoutes(app, {
      authConfig: config,
      authRepository: createInMemoryAuthRepository(),
      repository: createInMemoryGamesRepository([
        { id: 'game-1', ownerId: 'owner', slug: 'crypte', title: 'La Crypte', system: 'D&D', description: 'Desc', type: 'ONE_SHOT', status: 'OPEN', visibility: 'PUBLIC', maxPlayers: 4, tags: [] },
        { id: 'game-2', ownerId: 'owner', slug: 'privee', title: 'Privée', system: 'D&D', description: 'Desc', type: 'CAMPAIGN', status: 'OPEN', visibility: 'PRIVATE', maxPlayers: 4, tags: [] },
      ]),
    })

    const publicResponse = await app.request('/public/games/crypte')
    expect(publicResponse.status).toBe(200)
    expect((await publicResponse.json()).data.slug).toBe('crypte')

    const privateResponse = await app.request('/public/games/privee')
    expect(privateResponse.status).toBe(404)
  })
})

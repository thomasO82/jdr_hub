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

function createApp() {
  const app = new Hono<GamesRouteEnv>()
  registerGamesRoutes(app, {
    authConfig: config,
    authRepository: createInMemoryAuthRepository(),
    repository: createInMemoryGamesRepository([
      { id: 'game-1', ownerId: 'owner', slug: 'crypte', title: 'La Crypte', system: 'D&D', description: '<script>alert(1)</script>', type: 'ONE_SHOT', status: 'OPEN', visibility: 'PUBLIC', maxPlayers: 4, tags: ['horror', 'online'] },
      { id: 'game-2', ownerId: 'owner', slug: 'privee', title: 'Privée', system: 'D&D', description: 'Privée', type: 'CAMPAIGN', status: 'OPEN', visibility: 'PRIVATE', maxPlayers: 4, tags: [] },
      { id: 'game-3', ownerId: 'owner', slug: 'fermee', title: 'Fermée', system: 'D&D', description: 'Fermée', type: 'CAMPAIGN', status: 'CLOSED', visibility: 'PUBLIC', maxPlayers: 4, tags: [] },
    ]),
  })
  return app
}

describe('public games API routes', () => {
  it('returns only a safe projection for the public catalogue', async () => {
    const response = await createApp().request('/public/games')
    expect(response.status).toBe(200)
    const game = (await response.json()).data.items[0]
    expect(game).toMatchObject({ slug: 'crypte', title: 'La Crypte' })
    expect(game).not.toHaveProperty('id')
    expect(game).not.toHaveProperty('ownerId')
  })

  it('hides private and closed games behind the same public absence', async () => {
    const app = createApp()
    expect((await app.request('/public/games/privee')).status).toBe(404)
    expect((await app.request('/public/games/fermee')).status).toBe(404)
  })
})

import type { Context } from 'hono'
import { readAccessToken } from '../auth/cookies.js'
import type { AuthConfig } from '../auth/config.js'
import type { AuthRepository } from '../auth/repository.js'
import { authenticateUser } from '../auth/services/authenticate-user.js'
import { createGameSchema, gameQuerySchema, publicGamesQuerySchema, updateGameSchema } from '@jdr-hub/shared'
import type { GamesRepository, PublicGamesRepository } from './repository.js'
import { archiveGame } from './services/archive-game.js'
import { createGame } from './services/create-game.js'
import { getGame } from './services/get-game.js'
import { getPublicGame } from './services/get-public-game.js'
import { getPublicCollection } from './services/get-public-collection.js'
import { listPublicGames } from './services/list-public-games.js'
import { listGames } from './services/list-games.js'
import { updateGame } from './services/update-game.js'

type GameEnv = { Variables: { requestId: string } }
type Dependencies = { authConfig: AuthConfig; authRepository: AuthRepository; repository: GamesRepository & PublicGamesRepository; now?: () => Date }

function fail(c: Context<GameEnv>, status: 400 | 401 | 403 | 404 | 409) {
  return c.json({ data: null, error: { code: status === 401 ? 'AUTH_ERROR' : 'GAME_ERROR', message: status === 401 ? 'Authentication failed' : 'Game request failed' }, meta: { requestId: c.get('requestId') } }, status)
}

function requiredId(c: Context<GameEnv>): string | null {
  const id = c.req.param('id')
  return id && id.length > 0 ? id : null
}

async function currentUser(c: Context<GameEnv>, dependencies: Dependencies) {
  const token = readAccessToken(c)
  return token ? authenticateUser({ config: dependencies.authConfig, repository: dependencies.authRepository, token, now: (dependencies.now ?? (() => new Date()))() }) : null
}

export function createGameHandlers(dependencies: Dependencies) {
  return {
    list: async (c: Context<GameEnv>) => {
      const parsed = gameQuerySchema.safeParse(c.req.query())
      if (!parsed.success) return fail(c, 400)
      return c.json({ data: await listGames({ query: parsed.data, repository: dependencies.repository }), error: null, meta: { requestId: c.get('requestId') } })
    },
    tags: async (c: Context<GameEnv>) => c.json({ data: await dependencies.repository.listActiveTags(), error: null, meta: { requestId: c.get('requestId') } }),
    get: async (c: Context<GameEnv>) => {
      const id = requiredId(c)
      if (!id) return fail(c, 400)
      const game = await getGame({ id, repository: dependencies.repository })
      return game ? c.json({ data: game, error: null, meta: { requestId: c.get('requestId') } }) : fail(c, 404)
    },
    publicGet: async (c: Context<GameEnv>) => {
      const slug = c.req.param('slug')
      if (!slug) return fail(c, 400)
      const game = await getPublicGame({ slug, repository: dependencies.repository })
      return game ? c.json({ data: game, error: null, meta: { requestId: c.get('requestId') } }) : fail(c, 404)
    },
    publicList: async (c: Context<GameEnv>) => {
      const parsed = publicGamesQuerySchema.safeParse(c.req.query())
      if (!parsed.success) return fail(c, 400)
      return c.json({ data: await listPublicGames({ query: parsed.data, repository: dependencies.repository }), error: null, meta: { requestId: c.get('requestId') } })
    },
    publicCollection: async (c: Context<GameEnv>) => {
      const slug = c.req.param('slug')
      if (!slug || slug.length > 160) return fail(c, 400)
      const kind = c.req.path.startsWith('/public/gms/') ? 'gm' : c.req.path.startsWith('/public/tags/') ? 'tag' : 'system'
      const collection = await getPublicCollection({ kind, slug, repository: dependencies.repository })
      return collection ? c.json({ data: collection, error: null, meta: { requestId: c.get('requestId') } }) : fail(c, 404)
    },
    create: async (c: Context<GameEnv>) => {
      const user = await currentUser(c, dependencies)
      if (!user) return fail(c, 401)
      const parsed = createGameSchema.safeParse(await c.req.json().catch(() => null))
      if (!parsed.success) return fail(c, 400)
      try {
        const game = await createGame({ ownerId: user.id, game: parsed.data, repository: dependencies.repository })
        return c.json({ data: game, error: null, meta: { requestId: c.get('requestId') } }, 201)
      } catch { return fail(c, 409) }
    },
    update: async (c: Context<GameEnv>) => {
      const user = await currentUser(c, dependencies)
      if (!user) return fail(c, 401)
      const parsed = updateGameSchema.safeParse(await c.req.json().catch(() => null))
      if (!parsed.success) return fail(c, 400)
      const id = requiredId(c)
      if (!id) return fail(c, 400)
      try {
        const game = await updateGame({ id, ownerId: user.id, game: parsed.data, repository: dependencies.repository })
        return game ? c.json({ data: game, error: null, meta: { requestId: c.get('requestId') } }) : fail(c, 403)
      } catch { return fail(c, 409) }
    },
    archive: async (c: Context<GameEnv>) => {
      const user = await currentUser(c, dependencies)
      if (!user) return fail(c, 401)
      const id = requiredId(c)
      if (!id) return fail(c, 400)
      const archived = await archiveGame({ id, ownerId: user.id, repository: dependencies.repository })
      return archived ? c.body(null, 204) : fail(c, 403)
    },
  }
}

import type { Hono } from 'hono'
import { createGameHandlers } from './handlers.js'
import type { AuthConfig } from '../auth/config.js'
import type { AuthRepository } from '../auth/repository.js'
import type { GamesRepository, PublicGamesRepository } from './repository.js'

export type GamesDependencies = { authConfig: AuthConfig; authRepository: AuthRepository; repository: GamesRepository & PublicGamesRepository; now?: () => Date }
export type GamesRouteEnv = { Variables: { requestId: string } }

export function registerGamesRoutes(app: Hono<GamesRouteEnv>, dependencies: GamesDependencies): void {
  const handlers = createGameHandlers(dependencies)
  app.get('/games', handlers.list)
  app.get('/tags', handlers.tags)
  app.get('/public/games/:slug', handlers.publicGet)
  app.get('/public/games', handlers.publicList)
  app.get('/public/gms/:slug', handlers.publicCollection)
  app.get('/public/tags/:slug', handlers.publicCollection)
  app.get('/public/systems/:slug', handlers.publicCollection)
  app.get('/games/:id', handlers.get)
  app.post('/games', handlers.create)
  app.patch('/games/:id', handlers.update)
  app.delete('/games/:id', handlers.archive)
}

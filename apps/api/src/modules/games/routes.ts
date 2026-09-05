import type { Hono } from 'hono'
import { createGameHandlers } from './handlers.js'
import type { AuthConfig } from '../auth/config.js'
import type { AuthRepository } from '../auth/repository.js'
import type { GamesRepository } from './repository.js'

export type GamesDependencies = { authConfig: AuthConfig; authRepository: AuthRepository; repository: GamesRepository; now?: () => Date }
export type GamesRouteEnv = { Variables: { requestId: string } }

export function registerGamesRoutes(app: Hono<GamesRouteEnv>, dependencies: GamesDependencies): void {
  const handlers = createGameHandlers(dependencies)
  app.get('/games', handlers.list)
  app.get('/tags', handlers.tags)
  app.get('/games/:id', handlers.get)
  app.post('/games', handlers.create)
  app.patch('/games/:id', handlers.update)
  app.delete('/games/:id', handlers.archive)
}

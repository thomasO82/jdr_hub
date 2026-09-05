import { serve } from '@hono/node-server'
import { createDatabase, migrateDatabase } from '@jdr-hub/database'
import { createApiApp } from './app.js'
import { parsePort } from './config.js'
import { parseAuthConfig } from './modules/auth/config.js'
import { createPostgresAuthRepository } from './modules/auth/repository.js'
import { createPostgresGamesRepository } from './modules/games/repository.js'

async function startApi(): Promise<void> {
  const port = parsePort(process.env.PORT)
  const database = createDatabase(process.env.DATABASE_URL)
  const authConfig = parseAuthConfig(process.env)
  const authRepository = createPostgresAuthRepository(database.db)
  await migrateDatabase(database)

  serve({
    fetch: createApiApp({
      auth: { config: authConfig, repository: authRepository },
      games: { authConfig, authRepository, repository: createPostgresGamesRepository(database.db) },
    }).fetch,
    port,
  })
}

void startApi().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown startup error'
  console.error(`API startup failed: ${message}`)
  process.exitCode = 1
})

import { serve } from '@hono/node-server'
import { createDatabase } from '@jdr-hub/database'
import { createApiApp } from './app.js'
import { parsePort } from './config.js'
import { parseAuthConfig } from './modules/auth/config.js'
import { createPostgresAuthRepository } from './modules/auth/repository.js'

const port = parsePort(process.env.PORT)
const database = createDatabase(process.env.DATABASE_URL)
const authConfig = parseAuthConfig(process.env)

serve({
  fetch: createApiApp({
    auth: { config: authConfig, repository: createPostgresAuthRepository(database.db) },
  }).fetch,
  port,
})

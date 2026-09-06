import { serve } from '@hono/node-server'
import { createDatabase, migrateDatabase } from '@jdr-hub/database'
import { createApiApp } from './app.js'
import { parsePort } from './config.js'
import { parseAuthConfig } from './modules/auth/config.js'
import { createPostgresAuthRepository } from './modules/auth/repository.js'
import { createPostgresGamesRepository } from './modules/games/repository.js'
import { createPostgresApplicationRepository } from './modules/applications/repository.js'
import { createPostgresAvailabilityRepository } from './modules/availability/repository.js'
import { createPostgresSchedulingRepository } from './modules/scheduling/repository.js'
import { createPostgresAttendanceRepository } from './modules/attendance/repository.js'
import { createPostgresNotificationRepository } from './modules/notifications/repository.js'
import { parseMessageConfig } from './modules/messages/config.js'
import { createPostgresGameMessageRepository } from './modules/messages/repository.js'
import { createRedisGameMessageEventBus } from './modules/messages/redis-event-bus.js'

async function startApi(): Promise<void> {
  const port = parsePort(process.env.PORT)
  const database = createDatabase(process.env.DATABASE_URL)
  const authConfig = parseAuthConfig(process.env)
  const messageConfig = parseMessageConfig(process.env)
  const authRepository = createPostgresAuthRepository(database.db)
  const attendanceRepository = createPostgresAttendanceRepository(database.db)
  const notificationRepository = createPostgresNotificationRepository(database.db)
  const messageRepository = createPostgresGameMessageRepository(database.db)
  const messageEventBus = createRedisGameMessageEventBus(messageConfig.redisUrl)
  await migrateDatabase(database)

  const server = serve({
    fetch: createApiApp({
      auth: { config: authConfig, repository: authRepository },
      games: { authConfig, authRepository, repository: createPostgresGamesRepository(database.db) },
      applications: { authConfig, authRepository, repository: createPostgresApplicationRepository(database.db) },
      availability: { authConfig, authRepository, repository: createPostgresAvailabilityRepository(database.db) },
      scheduling: { authConfig, authRepository, repository: createPostgresSchedulingRepository(database.db) },
      attendance: { authConfig, authRepository, repository: attendanceRepository },
      notifications: { authConfig, authRepository, repository: notificationRepository },
      messages: { authConfig, authRepository, repository: messageRepository, eventBus: messageEventBus },
    }).fetch,
    port,
  })
  const shutdown = () => {
    server.close(() => { void database.client.end() })
  }
  process.once('SIGTERM', shutdown)
  process.once('SIGINT', shutdown)
}

void startApi().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown startup error'
  console.error(`API startup failed: ${message}`)
  process.exitCode = 1
})

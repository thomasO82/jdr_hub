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
import { createPostgresInvitationRepository } from './modules/invitations/repository.js'
import { createDiscordNotifier } from './modules/notifications/discord-client.js'
import { parseNotificationConfig } from './modules/notifications/config.js'
import { processDiscordDeliveries, startNotificationWorker } from './modules/notifications/worker.js'

async function startApi(): Promise<void> {
  const port = parsePort(process.env.PORT)
  const database = createDatabase(process.env.DATABASE_URL)
  const authConfig = parseAuthConfig(process.env)
  const notificationConfig = parseNotificationConfig(process.env)
  const authRepository = createPostgresAuthRepository(database.db)
  const attendanceRepository = createPostgresAttendanceRepository(database.db)
  const notificationRepository = createPostgresNotificationRepository(database.db)
  const invitationRepository = createPostgresInvitationRepository(database.db)
  const notifier = createDiscordNotifier(notificationConfig)
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
      invitations: { authConfig, authRepository, repository: invitationRepository },
    }).fetch,
    port,
  })
  const stopNotificationWorker = startNotificationWorker({
    process: () => processDiscordDeliveries({ repository: notificationRepository, notifier, limit: 20 }),
    intervalMs: 30_000,
  })
  const shutdown = () => {
    stopNotificationWorker()
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

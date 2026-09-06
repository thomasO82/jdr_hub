import { randomUUID } from 'node:crypto'
import { eq, inArray } from 'drizzle-orm'
import { afterAll, describe, expect, it } from 'vitest'
import {
  attendanceSchema,
  authSchema,
  createDatabase,
  gameSchema,
  migrateDatabase,
  schedulingSchema,
} from '@jdr-hub/database'
import { createPostgresAttendanceRepository } from '../../src/modules/attendance/repository.js'
import { createPostgresNotificationRepository } from '../../src/modules/notifications/repository.js'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error('DATABASE_URL is required for PostgreSQL integration tests')

const database = createDatabase(databaseUrl)
const { users } = authSchema
const { games, gameMembers } = gameSchema
const { gameSessions } = schedulingSchema
const { sessionAttendance, notifications, notificationDeliveries } = attendanceSchema

type Seed = { ownerId: string; playerId: string; gameId: string; sessionId: string }

async function seedSession(): Promise<Seed> {
  const ownerId = randomUUID()
  const playerId = randomUUID()
  const gameId = randomUUID()
  const sessionId = randomUUID()
  await database.db.insert(users).values([
    { id: ownerId, discordId: '100000000000000001', username: 'MJ integration' },
    { id: playerId, discordId: '200000000000000002', username: 'Joueur integration' },
  ])
  await database.db.insert(games).values({ id: gameId, ownerId, slug: `integration-${gameId}`, title: 'Partie intégration', system: 'Systeme', description: 'Données de test', type: 'CAMPAIGN', status: 'ACTIVE', visibility: 'PRIVATE', maxPlayers: 4 })
  await database.db.insert(gameMembers).values([
    { gameId, userId: ownerId, role: 'PLAYER', status: 'ACTIVE' },
    { gameId, userId: playerId, role: 'PLAYER', status: 'ACTIVE' },
  ])
  await database.db.insert(gameSessions).values({ id: sessionId, gameId, startsAt: new Date('2026-10-10T18:00:00.000Z'), endsAt: new Date('2026-10-10T21:00:00.000Z'), status: 'SCHEDULED' })
  return { ownerId, playerId, gameId, sessionId }
}

async function clean(seed: Seed): Promise<void> {
  const notificationRows = await database.db.select({ id: notifications.id }).from(notifications).where(eq(notifications.sessionId, seed.sessionId))
  const notificationIds = notificationRows.map((row) => row.id)
  if (notificationIds.length > 0) await database.db.delete(notificationDeliveries).where(inArray(notificationDeliveries.notificationId, notificationIds))
  await database.db.delete(notifications).where(eq(notifications.sessionId, seed.sessionId))
  await database.db.delete(sessionAttendance).where(eq(sessionAttendance.sessionId, seed.sessionId))
  await database.db.delete(gameSessions).where(eq(gameSessions.id, seed.sessionId))
  await database.db.delete(gameMembers).where(eq(gameMembers.gameId, seed.gameId))
  await database.db.delete(games).where(eq(games.id, seed.gameId))
  await database.db.delete(users).where(inArray(users.id, [seed.ownerId, seed.playerId]))
}

describe('PostgreSQL attendance and notification repositories', () => {
  it('applies migrations and persists an absence atomically and idempotently', async () => {
    await migrateDatabase(database)
    const seed = await seedSession()
    try {
      const repository = createPostgresAttendanceRepository(database.db)
      const first = await repository.reportAbsence({ sessionId: seed.sessionId, userId: seed.playerId, now: new Date('2026-09-06T12:00:00.000Z') })
      const second = await repository.reportAbsence({ sessionId: seed.sessionId, userId: seed.playerId, now: new Date('2026-09-06T12:01:00.000Z') })

      expect(second).toEqual(first)
      expect((await database.db.select().from(sessionAttendance).where(eq(sessionAttendance.sessionId, seed.sessionId)))).toHaveLength(1)
      expect((await database.db.select().from(notifications).where(eq(notifications.sessionId, seed.sessionId)))).toHaveLength(1)
      expect((await database.db.select().from(notificationDeliveries).where(eq(notificationDeliveries.notificationId, first.notification.id)))).toHaveLength(1)
    } finally {
      await clean(seed)
    }
  })

  it('closes a session and accepts only an identical completed replay', async () => {
    const seed = await seedSession()
    try {
      const repository = createPostgresAttendanceRepository(database.db)
      const entries = [{ userId: seed.playerId, status: 'PRESENT' as const }]
      const first = await repository.finalizeAttendance({ sessionId: seed.sessionId, ownerId: seed.ownerId, entries, now: new Date('2026-09-06T12:00:00.000Z') })
      const replay = await repository.finalizeAttendance({ sessionId: seed.sessionId, ownerId: seed.ownerId, entries, now: new Date('2026-09-06T12:01:00.000Z') })

      expect(replay).toEqual(first)
      await expect(repository.finalizeAttendance({ sessionId: seed.sessionId, ownerId: seed.ownerId, entries: [{ userId: seed.playerId, status: 'ABSENT' }], now: new Date() })).rejects.toThrow('ATTENDANCE_CONFLICT')
      expect((await database.db.select({ status: gameSessions.status }).from(gameSessions).where(eq(gameSessions.id, seed.sessionId)))[0]?.status).toBe('COMPLETED')
    } finally {
      await clean(seed)
    }
  })

  it('recovers a processing Discord delivery after its lease expires', async () => {
    const seed = await seedSession()
    try {
      const attendanceRepository = createPostgresAttendanceRepository(database.db)
      const event = await attendanceRepository.reportAbsence({ sessionId: seed.sessionId, userId: seed.playerId, now: new Date('2026-09-06T12:00:00.000Z') })
      const repository = createPostgresNotificationRepository(database.db)
      const firstClaim = await repository.claimPendingDeliveries({ now: new Date('2026-09-06T12:00:00.000Z'), limit: 1 })
      const recoveredClaim = await repository.claimPendingDeliveries({ now: new Date('2026-09-06T12:06:00.000Z'), limit: 1 })

      expect(firstClaim[0]).toMatchObject({ id: event.delivery.id, status: 'PROCESSING', attempts: 1 })
      expect(recoveredClaim[0]).toMatchObject({ id: event.delivery.id, status: 'PROCESSING', attempts: 2 })
      await repository.markSent({ deliveryId: event.delivery.id, providerMessageId: 'discord-message-integration', now: new Date('2026-09-06T12:07:00.000Z') })
      expect((await database.db.select({ status: notificationDeliveries.status, processingAt: notificationDeliveries.processingAt }).from(notificationDeliveries).where(eq(notificationDeliveries.id, event.delivery.id)))[0]).toMatchObject({ status: 'SENT', processingAt: null })
    } finally {
      await clean(seed)
    }
  })
})

afterAll(async () => {
  await database.client.end()
})

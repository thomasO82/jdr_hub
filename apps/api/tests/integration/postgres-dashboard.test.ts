import { randomUUID } from 'node:crypto'
import { eq, inArray } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { attendanceSchema, authSchema, createDatabase, gameSchema, migrateDatabase, schedulingSchema } from '@jdr-hub/database'
import { getDashboard } from '../../src/modules/dashboard/services/get-dashboard.js'
import { createPostgresDashboardRepository } from '../../src/modules/dashboard/repository.js'
import { createPostgresNotificationRepository } from '../../src/modules/notifications/repository.js'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error('DATABASE_URL is required for PostgreSQL integration tests')

const database = createDatabase(databaseUrl)
const { users } = authSchema
const { games, gameMembers } = gameSchema
const { gameSessions } = schedulingSchema
const { notifications } = attendanceSchema

type Seed = {
  ownerId: string
  memberId: string
  outsiderId: string
  gameId: string
  upcomingSessionId: string
  completedSessionId: string
  notificationId: string
  otherUserNotificationId: string
}

async function seedDashboard(): Promise<Seed> {
  const seed: Seed = {
    ownerId: randomUUID(),
    memberId: randomUUID(),
    outsiderId: randomUUID(),
    gameId: randomUUID(),
    upcomingSessionId: randomUUID(),
    completedSessionId: randomUUID(),
    notificationId: randomUUID(),
    otherUserNotificationId: randomUUID(),
  }
  await database.db.insert(users).values([
    { id: seed.ownerId, discordId: seed.ownerId.replaceAll('-', '').slice(0, 32), username: 'Dashboard owner' },
    { id: seed.memberId, discordId: seed.memberId.replaceAll('-', '').slice(0, 32), username: 'Dashboard member' },
    { id: seed.outsiderId, discordId: seed.outsiderId.replaceAll('-', '').slice(0, 32), username: 'Dashboard outsider' },
  ])
  await database.db.insert(games).values({ id: seed.gameId, ownerId: seed.ownerId, slug: `dashboard-${seed.gameId}`, title: 'La Crypte Maudite', system: 'D&D 5e', description: 'Données synthétiques de dashboard', type: 'CAMPAIGN', status: 'ACTIVE', visibility: 'PRIVATE', maxPlayers: 5 })
  await database.db.insert(gameMembers).values({ gameId: seed.gameId, userId: seed.memberId, role: 'PLAYER', status: 'ACTIVE' })
  await database.db.insert(gameSessions).values([
    { id: seed.upcomingSessionId, gameId: seed.gameId, startsAt: new Date('2026-10-10T18:00:00.000Z'), endsAt: new Date('2026-10-10T21:00:00.000Z'), status: 'SCHEDULED' },
    { id: seed.completedSessionId, gameId: seed.gameId, startsAt: new Date('2026-09-01T18:00:00.000Z'), endsAt: new Date('2026-09-01T21:00:00.000Z'), status: 'COMPLETED' },
  ])
  await database.db.insert(notifications).values([
    { id: seed.notificationId, type: 'ABSENCE_REPORTED', recipientId: seed.ownerId, gameId: seed.gameId, sessionId: seed.upcomingSessionId, actorId: seed.memberId, title: 'Absence signalée', body: 'Un joueur a signalé son absence pour une séance.', logicalKey: `dashboard-owner-${seed.notificationId}` },
    { id: seed.otherUserNotificationId, type: 'ABSENCE_REPORTED', recipientId: seed.memberId, gameId: seed.gameId, sessionId: seed.upcomingSessionId, actorId: seed.ownerId, title: 'Notification privée', body: 'Cette notification ne doit pas apparaître pour le MJ.', logicalKey: `dashboard-member-${seed.otherUserNotificationId}` },
  ])
  return seed
}

async function cleanDashboard(seed: Seed): Promise<void> {
  await database.db.delete(notifications).where(inArray(notifications.id, [seed.notificationId, seed.otherUserNotificationId]))
  await database.db.delete(gameSessions).where(inArray(gameSessions.id, [seed.upcomingSessionId, seed.completedSessionId]))
  await database.db.delete(gameMembers).where(eq(gameMembers.gameId, seed.gameId))
  await database.db.delete(games).where(eq(games.id, seed.gameId))
  await database.db.delete(users).where(inArray(users.id, [seed.ownerId, seed.memberId, seed.outsiderId]))
}

describe('PostgreSQL dashboard projections', () => {
  beforeAll(async () => {
    await migrateDatabase(database)
  })

  it('projects only sessions visible to the owner or active member', async () => {
    const seed = await seedDashboard()
    try {
      const repository = createPostgresDashboardRepository(database.db)
      const now = new Date('2026-09-08T12:00:00.000Z')
      const ownerDashboard = await repository.findNextSession({ userId: seed.ownerId, now })
      const memberDashboard = await repository.findNextSession({ userId: seed.memberId, now })
      const outsiderDashboard = await repository.findNextSession({ userId: seed.outsiderId, now })

      expect(ownerDashboard?.id).toBe(seed.upcomingSessionId)
      expect(memberDashboard?.id).toBe(seed.upcomingSessionId)
      expect(outsiderDashboard).toBeNull()
    } finally {
      await cleanDashboard(seed)
    }
  })

  it('keeps unread summaries recipient-scoped and excludes completed sessions', async () => {
    const seed = await seedDashboard()
    try {
      const repository = createPostgresDashboardRepository(database.db)
      const notificationsRepository = createPostgresNotificationRepository(database.db)
      const dashboard = await getDashboard({ userId: seed.ownerId, now: new Date('2026-09-08T12:00:00.000Z'), repository, notificationsRepository })

      expect(dashboard.nextSession).toMatchObject({ status: 'READY', data: { id: seed.upcomingSessionId } })
      expect(dashboard.notifications).toMatchObject({ status: 'READY', data: { unreadCount: 1 } })
      expect(JSON.stringify(dashboard)).not.toContain(seed.otherUserNotificationId)
    } finally {
      await cleanDashboard(seed)
    }
  })

  it('returns an empty notification block after the only notification is marked read', async () => {
    const seed = await seedDashboard()
    try {
      const repository = createPostgresDashboardRepository(database.db)
      const notificationsRepository = createPostgresNotificationRepository(database.db)
      const now = new Date('2026-09-08T12:00:00.000Z')
      await notificationsRepository.markRead({ notificationId: seed.notificationId, userId: seed.ownerId, now })
      await notificationsRepository.markRead({ notificationId: seed.notificationId, userId: seed.ownerId, now })
      const dashboard = await getDashboard({ userId: seed.ownerId, now, repository, notificationsRepository })

      expect(dashboard.notifications).toEqual({ status: 'EMPTY', data: null })
    } finally {
      await cleanDashboard(seed)
    }
  })
})

afterAll(async () => {
  await database.client.end()
})

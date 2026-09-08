import { randomUUID } from 'node:crypto'
import { eq, inArray } from 'drizzle-orm'
import { afterAll, describe, expect, it } from 'vitest'
import {
  attendanceSchema,
  authSchema,
  createDatabase,
  gameSchema,
  gamificationSchema,
  migrateDatabase,
  schedulingSchema,
} from '@jdr-hub/database'
import { validateAttendance } from '../../src/modules/attendance/services/validate-attendance.js'
import { createPostgresAttendanceRepository } from '../../src/modules/attendance/repository.js'
import { createPostgresGamificationRepository } from '../../src/modules/gamification/repository.js'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error('DATABASE_URL is required for PostgreSQL integration tests')

const database = createDatabase(databaseUrl)
const { users } = authSchema
const { games, gameMembers } = gameSchema
const { gameSessions } = schedulingSchema
const { sessionAttendance } = attendanceSchema
const { xpEvents } = gamificationSchema

type Seed = { ownerId: string; playerId: string; gameId: string; sessionId: string }

async function seedSession(): Promise<Seed> {
  const ownerId = randomUUID()
  const playerId = randomUUID()
  const gameId = randomUUID()
  const sessionId = randomUUID()
  await database.db.insert(users).values([
    { id: ownerId, discordId: `owner-${ownerId.slice(0, 20)}`, username: 'MJ XP integration' },
    { id: playerId, discordId: `player-${playerId.slice(0, 19)}`, username: 'Joueur XP integration' },
  ])
  await database.db.insert(games).values({
    id: gameId,
    ownerId,
    slug: `xp-integration-${gameId}`,
    title: 'Partie XP intégration',
    system: 'Systeme',
    description: 'Données de test',
    type: 'CAMPAIGN',
    status: 'ACTIVE',
    visibility: 'PRIVATE',
    maxPlayers: 4,
  })
  await database.db.insert(gameMembers).values([
    { gameId, userId: ownerId, role: 'PLAYER', status: 'ACTIVE' },
    { gameId, userId: playerId, role: 'PLAYER', status: 'ACTIVE' },
  ])
  await database.db.insert(gameSessions).values({
    id: sessionId,
    gameId,
    startsAt: new Date('2026-10-10T18:00:00.000Z'),
    endsAt: new Date('2026-10-10T21:00:00.000Z'),
    status: 'SCHEDULED',
  })
  return { ownerId, playerId, gameId, sessionId }
}

async function clean(seed: Seed): Promise<void> {
  await database.db.delete(sessionAttendance).where(eq(sessionAttendance.sessionId, seed.sessionId))
  await database.db.delete(gameSessions).where(eq(gameSessions.id, seed.sessionId))
  await database.db.delete(gameMembers).where(eq(gameMembers.gameId, seed.gameId))
  await database.db.delete(games).where(eq(games.id, seed.gameId))
  await database.db.delete(users).where(inArray(users.id, [seed.ownerId, seed.playerId]))
}

async function readPlayerXp(playerId: string): Promise<{ xp: number; level: number }> {
  const [row] = await database.db.select({ xp: users.xp, level: users.level }).from(users).where(eq(users.id, playerId)).limit(1)
  if (!row) throw new Error('TEST_USER_NOT_FOUND')
  return row
}

async function countPlayerEvents(playerId: string): Promise<number> {
  const rows = await database.db.select({ id: xpEvents.id }).from(xpEvents).where(eq(xpEvents.userId, playerId))
  return rows.length
}

describe('PostgreSQL attendance and XP attribution', () => {
  it('completes a session and awards XP atomically to PRESENT users', async () => {
    await migrateDatabase(database)
    const seed = await seedSession()
    try {
      const repository = createPostgresAttendanceRepository(database.db, {
        awardSessionXp: createPostgresGamificationRepository(database.db).awardSessionXp,
      })
      const records = await validateAttendance({
        sessionId: seed.sessionId,
        actorId: seed.ownerId,
        entries: [{ userId: seed.playerId, status: 'PRESENT' }],
        repository,
        now: () => new Date('2026-09-06T12:00:00.000Z'),
      })

      expect(records[0]?.status).toBe('PRESENT')
      expect(await readPlayerXp(seed.playerId)).toEqual({ xp: 100, level: 1 })
      expect(await countPlayerEvents(seed.playerId)).toBe(1)
    } finally {
      await clean(seed)
    }
  })

  it('replaying the same validation does not duplicate XP', async () => {
    const seed = await seedSession()
    try {
      const repository = createPostgresAttendanceRepository(database.db, {
        awardSessionXp: createPostgresGamificationRepository(database.db).awardSessionXp,
      })
      const input = {
        sessionId: seed.sessionId,
        actorId: seed.ownerId,
        entries: [{ userId: seed.playerId, status: 'PRESENT' as const }],
        repository,
        now: () => new Date('2026-09-06T12:00:00.000Z'),
      }

      await validateAttendance(input)
      await validateAttendance(input)

      expect(await readPlayerXp(seed.playerId)).toEqual({ xp: 100, level: 1 })
      expect(await countPlayerEvents(seed.playerId)).toBe(1)
    } finally {
      await clean(seed)
    }
  })

  it('rolls back attendance and XP when attribution fails', async () => {
    const seed = await seedSession()
    try {
      const repository = createPostgresAttendanceRepository(database.db, {
        awardSessionXp: async () => {
          throw new Error('XP_FAILURE')
        },
      })

      await expect(validateAttendance({
        sessionId: seed.sessionId,
        actorId: seed.ownerId,
        entries: [{ userId: seed.playerId, status: 'PRESENT' }],
        repository,
      })).rejects.toThrow('XP_FAILURE')

      expect((await database.db.select({ status: gameSessions.status }).from(gameSessions).where(eq(gameSessions.id, seed.sessionId)))[0]?.status).toBe('SCHEDULED')
      expect((await database.db.select({ userId: sessionAttendance.userId }).from(sessionAttendance).where(eq(sessionAttendance.sessionId, seed.sessionId)))).toHaveLength(0)
      expect(await countPlayerEvents(seed.playerId)).toBe(0)
    } finally {
      await clean(seed)
    }
  })
})

afterAll(async () => {
  await database.client.end()
})

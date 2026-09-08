import { randomUUID } from 'node:crypto'
import { and, eq, inArray } from 'drizzle-orm'
import { afterAll, describe, expect, it } from 'vitest'
import { authSchema, createDatabase, gameSchema, migrateDatabase, schedulingSchema } from '@jdr-hub/database'
import { createPostgresGamesRepository } from '../../src/modules/games/repository.js'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error('DATABASE_URL is required for PostgreSQL integration tests')

const database = createDatabase(databaseUrl)
const { users } = authSchema
const { games, gameMembers } = gameSchema
const { gameSessions } = schedulingSchema

describe('PostgreSQL public catalogue filters', () => {
  it('combines format, system, scheduled date and available places filters', async () => {
    await migrateDatabase(database)
    const ownerId = randomUUID()
    const playerId = randomUUID()
    const tableGameId = randomUUID()
    const onlineGameId = randomUUID()
    const sessionId = randomUUID()
    await database.db.insert(users).values([
      { id: ownerId, discordId: `filters-owner-${ownerId.slice(0, 16)}`, username: 'Filtres owner' },
      { id: playerId, discordId: `filters-player-${playerId.slice(0, 15)}`, username: 'Filtres player' },
    ])
    await database.db.insert(games).values([
      { id: tableGameId, ownerId, slug: `filters-table-${tableGameId}`, title: 'Table D&D', system: 'D&D 5e', description: 'Table', type: 'CAMPAIGN', format: 'TABLE', status: 'OPEN', visibility: 'PUBLIC', maxPlayers: 4 },
      { id: onlineGameId, ownerId, slug: `filters-online-${onlineGameId}`, title: 'Online D&D', system: 'D&D 5e', description: 'Online', type: 'CAMPAIGN', format: 'ONLINE', status: 'OPEN', visibility: 'PUBLIC', maxPlayers: 4 },
    ])
    await database.db.insert(gameMembers).values({ gameId: tableGameId, userId: playerId, role: 'PLAYER', status: 'ACTIVE' })
    await database.db.insert(gameSessions).values({ id: sessionId, gameId: tableGameId, startsAt: new Date('2026-10-15T18:00:00.000Z'), endsAt: new Date('2026-10-15T21:00:00.000Z'), status: 'SCHEDULED' })

    try {
      const result = await createPostgresGamesRepository(database.db).listPublic({
        tagSlugs: [], page: 1, pageSize: 20, type: 'CAMPAIGN', format: 'TABLE', system: 'D&D 5e',
        dateFrom: '2026-10-01', dateTo: '2026-10-31', minAvailablePlaces: 3,
      })
      expect(result.items).toHaveLength(1)
      expect(result.items[0]).toMatchObject({ slug: `filters-table-${tableGameId}`, format: 'TABLE', availablePlaces: 3, nextSessionStartsAt: '2026-10-15T18:00:00.000Z' })
    } finally {
      await database.db.delete(gameSessions).where(eq(gameSessions.id, sessionId))
      await database.db.delete(gameMembers).where(eq(gameMembers.gameId, tableGameId))
      await database.db.delete(games).where(inArray(games.id, [tableGameId, onlineGameId]))
      await database.db.delete(users).where(and(inArray(users.id, [ownerId, playerId])))
    }
  })
})

afterAll(async () => {
  await database.client.end()
})

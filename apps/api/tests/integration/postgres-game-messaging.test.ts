import { randomUUID } from 'node:crypto'
import { eq, inArray } from 'drizzle-orm'
import { afterAll, describe, expect, it } from 'vitest'
import { authSchema, createDatabase, gameMessagesSchema, gameSchema, migrateDatabase } from '@jdr-hub/database'
import { createPostgresGameMessageRepository } from '../../src/modules/messages/repository.js'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error('DATABASE_URL is required for PostgreSQL integration tests')

const database = createDatabase(databaseUrl)
const { users } = authSchema
const { games, gameMembers } = gameSchema
const { gameMessages } = gameMessagesSchema

type Seed = { ownerId: string; memberId: string; removedId: string; outsiderId: string; gameId: string }

async function seedGame(): Promise<Seed> {
  const ownerId = randomUUID()
  const memberId = randomUUID()
  const removedId = randomUUID()
  const outsiderId = randomUUID()
  const gameId = randomUUID()
  const discordSuffix = gameId.slice(0, 8)
  await database.db.insert(users).values([
    { id: ownerId, discordId: `owner-${discordSuffix}`, username: 'MJ messages' },
    { id: memberId, discordId: `member-${discordSuffix}`, username: 'Joueur messages' },
    { id: removedId, discordId: `removed-${discordSuffix}`, username: 'Ancien messages' },
    { id: outsiderId, discordId: `outsider-${discordSuffix}`, username: 'Exterieur messages' },
  ])
  await database.db.insert(games).values({ id: gameId, ownerId, slug: `messages-${gameId}`, title: 'Partie messages', system: 'Systeme', description: 'Données de test', type: 'CAMPAIGN', status: 'ACTIVE', visibility: 'PRIVATE', maxPlayers: 4 })
  await database.db.insert(gameMembers).values([
    { gameId, userId: memberId, role: 'PLAYER', status: 'ACTIVE' },
    { gameId, userId: removedId, role: 'PLAYER', status: 'REMOVED' },
  ])
  return { ownerId, memberId, removedId, outsiderId, gameId }
}

async function clean(seed: Seed): Promise<void> {
  await database.db.delete(gameMessages).where(eq(gameMessages.gameId, seed.gameId))
  await database.db.delete(gameMembers).where(eq(gameMembers.gameId, seed.gameId))
  await database.db.delete(games).where(eq(games.id, seed.gameId))
  await database.db.delete(users).where(inArray(users.id, [seed.ownerId, seed.memberId, seed.removedId, seed.outsiderId]))
}

describe('PostgreSQL game message repository', () => {
  it('migrates, authorizes, paginates stably, and removes messages with their game', async () => {
    await migrateDatabase(database)
    const seed = await seedGame()
    try {
      const repository = createPostgresGameMessageRepository(database.db)
      const ownerAccess = await repository.getAccess({ gameIdOrSlug: `messages-${seed.gameId}`, userId: seed.ownerId })
      const memberAccess = await repository.getAccess({ gameIdOrSlug: seed.gameId, userId: seed.memberId })
      const removedAccess = await repository.getAccess({ gameIdOrSlug: seed.gameId, userId: seed.removedId })
      const outsiderAccess = await repository.getAccess({ gameIdOrSlug: seed.gameId, userId: seed.outsiderId })

      expect(ownerAccess).toMatchObject({ gameId: seed.gameId, canRead: true, canWrite: true })
      expect(memberAccess).toMatchObject({ canRead: true, canWrite: true, memberStatus: 'ACTIVE' })
      expect(removedAccess).toMatchObject({ canRead: false, canWrite: false, memberStatus: 'REMOVED' })
      expect(outsiderAccess).toMatchObject({ canRead: false, canWrite: false, memberStatus: 'NONE' })

      const first = await repository.create({ gameIdOrSlug: seed.gameId, authorId: seed.memberId, content: 'Premier', now: new Date('2026-09-06T12:00:00.000Z') })
      const second = await repository.create({ gameIdOrSlug: seed.gameId, authorId: seed.ownerId, content: 'Deuxième', now: new Date('2026-09-06T12:01:00.000Z') })
      const third = await repository.create({ gameIdOrSlug: seed.gameId, authorId: seed.memberId, content: 'Troisième', now: new Date('2026-09-06T12:02:00.000Z') })
      const large = await repository.create({ gameIdOrSlug: seed.gameId, authorId: seed.memberId, content: 'x'.repeat(2_000), now: new Date('2026-09-06T12:03:00.000Z') })

      const firstPage = await repository.list({ gameId: seed.gameId, userId: seed.memberId, cursor: null, limit: 2 })
      const secondPage = await repository.list({ gameId: seed.gameId, userId: seed.memberId, cursor: firstPage.nextCursor, limit: 2 })
      expect(firstPage.items.map((message) => message.id)).toEqual([large.id, third.id])
      expect(secondPage.items.map((message) => message.id)).toEqual([second.id, first.id])
      expect(first.content).toBe('Premier')
      expect(large.content).toHaveLength(2_000)

      await database.db.update(games).set({ status: 'CLOSED' }).where(eq(games.id, seed.gameId))
      expect(await repository.getAccess({ gameIdOrSlug: seed.gameId, userId: seed.memberId })).toMatchObject({ canRead: true, canWrite: false })
      await expect(repository.create({ gameIdOrSlug: seed.gameId, authorId: seed.memberId, content: 'Refusé', now: new Date() })).rejects.toThrow('MESSAGE_FORBIDDEN')
      await database.db.delete(games).where(eq(games.id, seed.gameId))
      expect(await database.db.select().from(gameMessages).where(eq(gameMessages.gameId, seed.gameId))).toHaveLength(0)
    } finally {
      await clean(seed)
    }
  })
})

afterAll(async () => {
  await database.client.end()
})

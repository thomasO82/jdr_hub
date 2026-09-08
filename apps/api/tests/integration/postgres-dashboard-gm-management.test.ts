import { randomUUID } from 'node:crypto'
import { and, eq, inArray } from 'drizzle-orm'
import { afterAll, describe, expect, it } from 'vitest'
import { authSchema, createDatabase, gameSchema, invitationsSchema, migrateDatabase } from '@jdr-hub/database'
import { createPostgresDashboardRepository } from '../../src/modules/dashboard/repository.js'
import { createPostgresInvitationRepository } from '../../src/modules/invitations/repository.js'
import { createPostgresMemberRepository } from '../../src/modules/members/repository.js'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error('DATABASE_URL is required for PostgreSQL integration tests')

const database = createDatabase(databaseUrl)
const { users } = authSchema
const { games, gameMembers } = gameSchema
const { invitations } = invitationsSchema

type Seed = { ownerId: string; inviteeId: string; otherId: string; gameId: string; invitationId: string | null; secondInvitationId: string | null }

async function seed(): Promise<Seed> {
  const suffix = randomUUID().replaceAll('-', '').slice(0, 12)
  const ownerId = randomUUID()
  const inviteeId = randomUUID()
  const otherId = randomUUID()
  const gameId = randomUUID()
  await database.db.insert(users).values([
    { id: ownerId, discordId: `f08-owner-${suffix}`, username: 'MJ F08 integration' },
    { id: inviteeId, discordId: `f08-invitee-${suffix}`, username: 'Joueur F08 integration' },
    { id: otherId, discordId: `f08-other-${suffix}`, username: 'Autre F08 integration' },
  ])
  await database.db.insert(games).values({ id: gameId, ownerId, slug: `f08-integration-${suffix}`, title: 'Partie F08 intégration', system: 'Système test', description: 'Fixture de test', type: 'CAMPAIGN', status: 'OPEN', visibility: 'PRIVATE', maxPlayers: 1 })
  return { ownerId, inviteeId, otherId, gameId, invitationId: null, secondInvitationId: null }
}

async function clean(seed: Seed): Promise<void> {
  await database.db.delete(invitations).where(eq(invitations.gameId, seed.gameId))
  await database.db.delete(gameMembers).where(eq(gameMembers.gameId, seed.gameId))
  await database.db.delete(games).where(eq(games.id, seed.gameId))
  await database.db.delete(users).where(inArray(users.id, [seed.ownerId, seed.inviteeId, seed.otherId]))
}

describe('PostgreSQL dashboard and GM management repositories', () => {
  it('migrates F08, enforces invitation uniqueness/capacity and updates the roster transactionally', async () => {
    await migrateDatabase(database)
    const seedData = await seed()
    try {
      const now = new Date('2026-09-06T12:00:00.000Z')
      const invitationRepository = createPostgresInvitationRepository(database.db)
      const first = await invitationRepository.create({ gameId: seedData.gameId, inviterId: seedData.ownerId, inviteeId: seedData.inviteeId, expiresAt: new Date('2026-09-13T12:00:00.000Z'), now })
      seedData.invitationId = first.id
      await expect(invitationRepository.create({ gameId: seedData.gameId, inviterId: seedData.ownerId, inviteeId: seedData.inviteeId, expiresAt: new Date('2026-09-13T12:00:00.000Z'), now })).rejects.toThrow('INVITATION_CONFLICT')

      const accepted = await invitationRepository.updateStatus({ invitationId: first.id, actorId: seedData.inviteeId, status: 'ACCEPTED', now })
      expect(accepted).toMatchObject({ id: first.id, status: 'ACCEPTED', inviteeId: seedData.inviteeId })
      expect((await database.db.select().from(gameMembers).where(and(eq(gameMembers.gameId, seedData.gameId), eq(gameMembers.userId, seedData.inviteeId))))).toHaveLength(1)

      const second = await invitationRepository.create({ gameId: seedData.gameId, inviterId: seedData.ownerId, inviteeId: seedData.otherId, expiresAt: new Date('2026-09-13T12:00:00.000Z'), now })
      seedData.secondInvitationId = second.id
      await expect(invitationRepository.updateStatus({ invitationId: second.id, actorId: seedData.otherId, status: 'ACCEPTED', now })).rejects.toThrow('INVITATION_CONFLICT')
      expect(await invitationRepository.updateStatus({ invitationId: second.id, actorId: seedData.ownerId, status: 'CANCELLED', now })).toMatchObject({ status: 'CANCELLED' })

      const memberRepository = createPostgresMemberRepository(database.db)
      const roster = await memberRepository.listForOwner(seedData.gameId, seedData.ownerId)
      expect(roster).toEqual(expect.arrayContaining([expect.objectContaining({ userId: seedData.ownerId, role: 'GM' }), expect.objectContaining({ userId: seedData.inviteeId, role: 'PLAYER' })]))
      expect(await memberRepository.remove({ gameId: seedData.gameId, ownerId: seedData.ownerId, userId: seedData.inviteeId, now })).toBe(true)
      expect(await memberRepository.remove({ gameId: seedData.gameId, ownerId: seedData.ownerId, userId: seedData.inviteeId, now })).toBe(false)
    } finally {
      await clean(seedData)
    }
  })

  it('keeps management private and returns only the owner game projection', async () => {
    await migrateDatabase(database)
    const seedData = await seed()
    try {
      const repository = createPostgresDashboardRepository(database.db)
      const dashboard = await repository.getUser(seedData.ownerId)
      expect(dashboard).toMatchObject({ id: seedData.ownerId, username: 'MJ F08 integration' })
      const gamesForOwner = await repository.listActiveGames(seedData.ownerId)
      expect(gamesForOwner).toEqual(expect.arrayContaining([expect.objectContaining({ id: seedData.gameId, role: 'GM', activePlayers: 0 })]))
      expect(await repository.getGameManagement(seedData.gameId, seedData.otherId, new Date('2026-09-06T12:00:00.000Z'))).toBeNull()
      const management = await repository.getGameManagement(seedData.gameId, seedData.ownerId, new Date('2026-09-06T12:00:00.000Z'))
      expect(management).toMatchObject({ game: { id: seedData.gameId, role: 'GM' }, applications: [], invitations: [] })
      expect(JSON.stringify(management)).not.toContain('discord')
    } finally {
      await clean(seedData)
    }
  })
})

afterAll(async () => {
  await database.client.end()
})

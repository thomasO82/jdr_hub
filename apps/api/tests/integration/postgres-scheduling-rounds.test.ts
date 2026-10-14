import { randomUUID } from 'node:crypto'
import { eq, inArray } from 'drizzle-orm'
import { afterAll, describe, expect, it } from 'vitest'
import { authSchema, createDatabase, gameSchema, migrateDatabase, schedulingSchema } from '@jdr-hub/database'
import { createPostgresSchedulingRepository } from '../../src/modules/scheduling/repository.js'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error('DATABASE_URL is required for PostgreSQL integration tests')

const database = createDatabase(databaseUrl)
const { users } = authSchema
const { games, gameMembers } = gameSchema
const { gameSessions, timeProposalRounds, timeProposals, timeVotes } = schedulingSchema

describe('PostgreSQL scheduling proposal rounds', () => {
  it('migrates legacy tables, closes selected round siblings and serializes a new round', async () => {
    await migrateDatabase(database)
    const ownerId = randomUUID()
    const memberId = randomUUID()
    const gameId = randomUUID()
    const suffix = gameId.slice(0, 8)
    await database.db.insert(users).values([
      { id: ownerId, discordId: `round-owner-${suffix}`, username: 'MJ rounds test' },
      { id: memberId, discordId: `round-member-${suffix}`, username: 'Joueur rounds test' },
    ])
    await database.db.insert(games).values({ id: gameId, ownerId, slug: `rounds-${gameId}`, title: 'Partie votes test', system: 'Système', description: 'Données fictives', type: 'CAMPAIGN', status: 'ACTIVE', visibility: 'PRIVATE', maxPlayers: 4 })
    await database.db.insert(gameMembers).values({ gameId, userId: memberId, role: 'PLAYER', status: 'ACTIVE' })

    try {
      const repository = createPostgresSchedulingRepository(database.db)
      const now = new Date('2026-10-01T12:00:00.000Z')
      const options = await repository.createProposals({
        gameId,
        proposerId: ownerId,
        now,
        slots: [
          { startsAt: '2026-10-20T18:00:00.000Z', endsAt: '2026-10-20T21:00:00.000Z' },
          { startsAt: '2026-10-21T18:00:00.000Z', endsAt: '2026-10-21T21:00:00.000Z' },
        ],
      })
      expect(options).toHaveLength(2)
      expect(options[0]?.roundId).toBe(options[1]?.roundId)
      await repository.createVote({ proposalId: options[0]!.id, userId: memberId, vote: 'YES', now })
      await repository.selectProposal({ gameId, proposalId: options[1]!.id, now })

      const history = await repository.listProposals(gameId, memberId)
      expect(history.find((proposal) => proposal.id === options[0]!.id)).toMatchObject({ status: 'CLOSED', roundStatus: 'SELECTED', votes: { yes: 1 } })
      expect(history.find((proposal) => proposal.id === options[1]!.id)).toMatchObject({ status: 'SELECTED', roundStatus: 'SELECTED' })
      await expect(repository.createVote({ proposalId: options[0]!.id, userId: memberId, vote: 'NO', now })).rejects.toThrow('SCHEDULING_CONFLICT')

      const selectedSession = (await repository.listGameSessions(gameId)).find((session) => session.proposalId === options[1]!.id)!
      const changedStartsAt = new Date('2026-10-22T18:00:00.000Z')
      const changedEndsAt = new Date('2026-10-22T21:00:00.000Z')
      expect(await repository.updateScheduledSession({ gameId, sessionId: selectedSession.id, startsAt: changedStartsAt, endsAt: changedEndsAt, now })).toMatchObject({ startsAt: changedStartsAt, endsAt: changedEndsAt })
      expect((await repository.listProposals(gameId, memberId)).find((proposal) => proposal.id === options[1]!.id)).toMatchObject({ status: 'SELECTED', startsAt: new Date('2026-10-21T18:00:00.000Z') })
      expect(await repository.cancelScheduledSession({ gameId, sessionId: selectedSession.id, now })).toMatchObject({ status: 'CANCELLED' })
      expect((await repository.listProposals(gameId, memberId)).find((proposal) => proposal.id === options[1]!.id)).toMatchObject({ status: 'SELECTED', roundStatus: 'CANCELLED', votes: { yes: 0 } })
      expect((await repository.listPlanning({ userId: ownerId, from: null, to: null })).items).toHaveLength(0)
      await expect(repository.cancelScheduledSession({ gameId, sessionId: selectedSession.id, now })).rejects.toThrow('SCHEDULING_CONFLICT')
      const fixedReplacement = await repository.createFixedSession({ gameId, startsAt: changedStartsAt, endsAt: changedEndsAt, notes: null, now })
      expect((await repository.listGameSessions(gameId)).map((session) => session.status)).toEqual(['CANCELLED', 'SCHEDULED'])
      expect(fixedReplacement.status).toBe('SCHEDULED')

      const competingOptions = await repository.createProposals({
        gameId,
        proposerId: ownerId,
        now,
        slots: [
          { startsAt: '2026-10-22T18:00:00.000Z', endsAt: '2026-10-22T21:00:00.000Z' },
          { startsAt: '2026-10-23T18:00:00.000Z', endsAt: '2026-10-23T21:00:00.000Z' },
        ],
      })
      const selections = await Promise.allSettled(competingOptions.map((option) => repository.selectProposal({ gameId, proposalId: option.id, now })))
      expect(selections.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
      expect(selections.filter((result) => result.status === 'rejected')).toHaveLength(1)

      const competingRounds = await Promise.allSettled([
        repository.createProposals({ gameId, proposerId: ownerId, slots: [{ startsAt: '2026-10-24T18:00:00.000Z', endsAt: '2026-10-24T21:00:00.000Z' }], now }),
        repository.createProposals({ gameId, proposerId: ownerId, slots: [{ startsAt: '2026-10-25T18:00:00.000Z', endsAt: '2026-10-25T21:00:00.000Z' }], now }),
      ])
      expect(competingRounds.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
      expect(competingRounds.filter((result) => result.status === 'rejected')).toHaveLength(1)
      expect(await database.db.select({ id: timeProposalRounds.id }).from(timeProposalRounds).where(eq(timeProposalRounds.gameId, gameId))).toHaveLength(3)
      expect(await database.db.select({ id: timeProposals.id }).from(timeProposals).where(eq(timeProposals.gameId, gameId))).toHaveLength(5)
      expect(await database.db.select({ id: gameSessions.id }).from(gameSessions).where(eq(gameSessions.gameId, gameId))).toHaveLength(3)
    } finally {
      await database.db.delete(games).where(eq(games.id, gameId))
      await database.db.delete(users).where(inArray(users.id, [ownerId, memberId]))
    }
  })
})

afterAll(async () => {
  await database.client.end()
})

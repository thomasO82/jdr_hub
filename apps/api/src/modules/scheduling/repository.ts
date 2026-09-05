import { and, asc, eq, gte, inArray, lte, or } from 'drizzle-orm'
import { authSchema, gameSchema, schedulingSchema, type createDatabase } from '@jdr-hub/database'
import type { GameStatus, GameType, ProposalStatus, SessionStatus, SessionWindow, VoteValue } from '@jdr-hub/shared'

export type SchedulingGame = {
  id: string
  ownerId: string
  title: string
  type: GameType
  status: GameStatus
}

export type ProposalRecord = {
  id: string
  gameId: string
  proposerId: string
  startsAt: Date
  endsAt: Date
  status: ProposalStatus
  createdAt: Date
  updatedAt: Date
}

export type ProposalView = ProposalRecord & {
  votes: { yes: number; maybe: number; no: number }
  userVote: VoteValue | null
}

export type SessionRecord = {
  id: string
  gameId: string
  proposalId: string | null
  gameTitle: string
  startsAt: Date
  endsAt: Date
  status: SessionStatus
  notes: string | null
}

export type PlanningPage = { items: SessionRecord[]; from: Date | null; to: Date | null }

export interface SchedulingRepository {
  findGame(gameId: string): Promise<SchedulingGame | null>
  countSessions(gameId: string): Promise<number>
  isActiveMember(gameId: string, userId: string): Promise<boolean>
  createProposals(input: { gameId: string; proposerId: string; slots: SessionWindow[]; now: Date }): Promise<ProposalRecord[]>
  listProposals(gameId: string, userId: string): Promise<ProposalView[]>
  findProposal(proposalId: string): Promise<ProposalRecord | null>
  createVote(input: { proposalId: string; userId: string; vote: VoteValue; now: Date }): Promise<void>
  createFixedSession(input: { gameId: string; startsAt: Date; endsAt: Date; notes: string | null; now: Date }): Promise<SessionRecord>
  selectProposal(input: { gameId: string; proposalId: string; now: Date }): Promise<SessionRecord>
  listPlanning(input: { userId: string; from: Date | null; to: Date | null }): Promise<PlanningPage>
}

type Database = ReturnType<typeof createDatabase>['db']

const toGame = (row: { id: string; ownerId: string; title: string; type: string; status: string }): SchedulingGame => ({
  ...row,
  type: row.type as GameType,
  status: row.status as GameStatus,
})

const toProposal = (row: { id: string; gameId: string; proposerId: string; startsAt: Date; endsAt: Date; status: string; createdAt: Date; updatedAt: Date }): ProposalRecord => ({
  ...row,
  status: row.status as ProposalStatus,
})

export function createPostgresSchedulingRepository(database: Database): SchedulingRepository {
  const { users } = authSchema
  const { games, gameMembers } = gameSchema
  const { gameSessions, timeProposals, timeVotes } = schedulingSchema

  return {
    async findGame(gameId) {
      const [row] = await database.select({ id: games.id, ownerId: games.ownerId, title: games.title, type: games.type, status: games.status }).from(games).where(eq(games.id, gameId)).limit(1)
      return row ? toGame(row) : null
    },
    async countSessions(gameId) {
      const rows = await database.select({ id: gameSessions.id }).from(gameSessions).where(and(eq(gameSessions.gameId, gameId), inArray(gameSessions.status, ['PROPOSED', 'SCHEDULED', 'COMPLETED'])))
      return rows.length
    },
    async isActiveMember(gameId, userId) {
      const [member] = await database.select({ userId: gameMembers.userId }).from(gameMembers).where(and(eq(gameMembers.gameId, gameId), eq(gameMembers.userId, userId), eq(gameMembers.status, 'ACTIVE'))).limit(1)
      if (member) return true
      const [owner] = await database.select({ id: games.id }).from(games).where(and(eq(games.id, gameId), eq(games.ownerId, userId))).limit(1)
      return Boolean(owner)
    },
    async createProposals({ gameId, proposerId, slots, now }) {
      const rows = await database.insert(timeProposals).values(slots.map((slot) => ({ gameId, proposerId, startsAt: new Date(slot.startsAt), endsAt: new Date(slot.endsAt), createdAt: now, updatedAt: now }))).returning()
      return rows.map(toProposal)
    },
    async listProposals(gameId, userId) {
      const proposals = await database.select().from(timeProposals).where(eq(timeProposals.gameId, gameId)).orderBy(asc(timeProposals.startsAt))
      const votes = await database.select({ proposalId: timeVotes.proposalId, userId: timeVotes.userId, vote: timeVotes.vote }).from(timeVotes).innerJoin(timeProposals, eq(timeVotes.proposalId, timeProposals.id)).where(eq(timeProposals.gameId, gameId))
      return proposals.map((proposal) => {
        const proposalVotes = votes.filter((vote) => vote.proposalId === proposal.id)
        return { ...toProposal(proposal), votes: { yes: proposalVotes.filter((vote) => vote.vote === 'YES').length, maybe: proposalVotes.filter((vote) => vote.vote === 'MAYBE').length, no: proposalVotes.filter((vote) => vote.vote === 'NO').length }, userVote: (proposalVotes.find((vote) => vote.userId === userId)?.vote as VoteValue | undefined) ?? null }
      })
    },
    async findProposal(proposalId) {
      const [row] = await database.select().from(timeProposals).where(eq(timeProposals.id, proposalId)).limit(1)
      return row ? toProposal(row) : null
    },
    async createVote({ proposalId, userId, vote, now }) {
      try {
        await database.insert(timeVotes).values({ proposalId, userId, vote, createdAt: now, updatedAt: now })
      } catch {
        throw new Error('SCHEDULING_CONFLICT')
      }
    },
    async createFixedSession({ gameId, startsAt, endsAt, notes, now }) {
      const [row] = await database.insert(gameSessions).values({ gameId, startsAt, endsAt, status: 'SCHEDULED', notes, createdAt: now, updatedAt: now }).returning()
      if (!row) throw new Error('SCHEDULING_CREATE_FAILED')
      const [game] = await database.select({ title: games.title }).from(games).where(eq(games.id, gameId)).limit(1)
      return { id: row.id, gameId: row.gameId, proposalId: row.proposalId, gameTitle: game?.title ?? '', startsAt: row.startsAt, endsAt: row.endsAt, status: row.status as SessionStatus, notes: row.notes }
    },
    async selectProposal({ gameId, proposalId, now }) {
      return database.transaction(async (tx) => {
        const [proposal] = await tx.select().from(timeProposals).where(and(eq(timeProposals.id, proposalId), eq(timeProposals.gameId, gameId))).for('update').limit(1)
        if (!proposal) throw new Error('SCHEDULING_NOT_FOUND')
        const [existing] = await tx.select().from(gameSessions).where(eq(gameSessions.proposalId, proposalId)).limit(1)
        if (existing) {
          const [game] = await tx.select({ title: games.title }).from(games).where(eq(games.id, gameId)).limit(1)
          return { id: existing.id, gameId: existing.gameId, proposalId: existing.proposalId, gameTitle: game?.title ?? '', startsAt: existing.startsAt, endsAt: existing.endsAt, status: existing.status as SessionStatus, notes: existing.notes }
        }
        if (proposal.status !== 'OPEN') throw new Error('SCHEDULING_CONFLICT')
        await tx.update(timeProposals).set({ status: 'SELECTED', updatedAt: now }).where(eq(timeProposals.id, proposalId))
        const [created] = await tx.insert(gameSessions).values({ gameId, proposalId, startsAt: proposal.startsAt, endsAt: proposal.endsAt, status: 'SCHEDULED', createdAt: now, updatedAt: now }).returning()
        if (!created) throw new Error('SCHEDULING_CREATE_FAILED')
        const [game] = await tx.select({ title: games.title }).from(games).where(eq(games.id, gameId)).limit(1)
        return { id: created.id, gameId: created.gameId, proposalId: created.proposalId, gameTitle: game?.title ?? '', startsAt: created.startsAt, endsAt: created.endsAt, status: created.status as SessionStatus, notes: created.notes }
      })
    },
    async listPlanning({ userId, from, to }) {
      const rows = await database.select({ id: gameSessions.id, gameId: gameSessions.gameId, proposalId: gameSessions.proposalId, gameTitle: games.title, startsAt: gameSessions.startsAt, endsAt: gameSessions.endsAt, status: gameSessions.status, notes: gameSessions.notes }).from(gameSessions).innerJoin(games, eq(gameSessions.gameId, games.id)).leftJoin(gameMembers, eq(gameMembers.gameId, gameSessions.gameId)).where(and(or(eq(games.ownerId, userId), and(eq(gameMembers.userId, userId), eq(gameMembers.status, 'ACTIVE'))), inArray(gameSessions.status, ['SCHEDULED', 'COMPLETED']), ...(from ? [gte(gameSessions.endsAt, from)] : []), ...(to ? [lte(gameSessions.startsAt, to)] : []))).orderBy(asc(gameSessions.startsAt))
      return { items: rows.map((row) => ({ ...row, status: row.status as SessionStatus })), from, to }
    },
  }
}

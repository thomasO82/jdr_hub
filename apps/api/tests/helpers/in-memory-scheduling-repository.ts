import type { GameStatus, ProposalRoundStatus, ProposalStatus, SessionStatus, VoteValue } from '@jdr-hub/shared'
import type { PlanningPage, ProposalRecord, ProposalView, SchedulingGame, SchedulingRepository, SessionRecord } from '../../src/modules/scheduling/repository.js'

type InMemoryGame = SchedulingGame
type VoteRecord = { proposalId: string; userId: string; vote: VoteValue }
type RoundRecord = { id: string; gameId: string; proposerId: string; status: ProposalRoundStatus; createdAt: Date; updatedAt: Date }

export function createInMemorySchedulingRepository(input: { games: InMemoryGame[]; members: Array<{ gameId: string; userId: string }> }): SchedulingRepository & {
  setGameStatus(gameId: string, status: GameStatus): void
  closeProposal(proposalId: string): void
  seedSessions(gameId: string, count: number): Promise<void>
} {
  const games = [...input.games]
  const members = [...input.members]
  const rounds: RoundRecord[] = []
  const proposals: ProposalRecord[] = []
  const votes: VoteRecord[] = []
  const sessions: SessionRecord[] = []
  let id = 100
  const nextId = () => `00000000-0000-4000-8000-${String(id++).padStart(12, '0')}`
  const game = (gameId: string) => games.find((candidate) => candidate.id === gameId) ?? null
  const proposal = (proposalId: string) => proposals.find((candidate) => candidate.id === proposalId) ?? null
  const toView = (record: ProposalRecord, userId: string): ProposalView => {
    const proposalVotes = votes.filter((vote) => vote.proposalId === record.id)
    const currentRound = rounds.find((round) => round.id === record.roundId)
    return {
      ...record,
      roundStatus: currentRound?.status ?? record.roundStatus,
      votes: {
        yes: proposalVotes.filter((vote) => vote.vote === 'YES').length,
        maybe: proposalVotes.filter((vote) => vote.vote === 'MAYBE').length,
        no: proposalVotes.filter((vote) => vote.vote === 'NO').length,
      },
      userVote: proposalVotes.find((vote) => vote.userId === userId)?.vote ?? null,
    }
  }
  const session = (gameId: string, proposalId: string | null, startsAt: Date, endsAt: Date, status: SessionStatus, notes: string | null): SessionRecord => ({
    id: nextId(), gameId, proposalId, gameTitle: game(gameId)?.title ?? '', startsAt, endsAt, status, notes,
  })

  return {
    async findGame(gameId) { return game(gameId) },
    async countSessions(gameId) { return sessions.filter((item) => item.gameId === gameId && item.status !== 'CANCELLED').length },
    async isActiveMember(gameId, userId) { return members.some((member) => member.gameId === gameId && member.userId === userId) || game(gameId)?.ownerId === userId },
    async createProposals({ gameId, proposerId, slots, now }) {
      if (rounds.some((round) => round.gameId === gameId && round.status === 'OPEN')) throw new Error('SCHEDULING_CONFLICT')
      const round: RoundRecord = { id: nextId(), gameId, proposerId, status: 'OPEN', createdAt: now, updatedAt: now }
      rounds.push(round)
      const created = slots.map((slot) => ({ id: nextId(), gameId, proposerId, roundId: round.id, roundStatus: round.status, startsAt: new Date(slot.startsAt), endsAt: new Date(slot.endsAt), status: 'OPEN' as ProposalStatus, createdAt: now, updatedAt: now }))
      proposals.push(...created)
      return created
    },
    async listProposals(gameId, userId) { return proposals.filter((item) => item.gameId === gameId).sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime()).map((item) => toView(item, userId)) },
    async findProposal(proposalId) {
      const found = proposal(proposalId)
      if (!found) return null
      return { ...found, roundStatus: rounds.find((round) => round.id === found.roundId)?.status ?? found.roundStatus }
    },
    async createVote({ proposalId, userId, vote }) {
      const found = proposal(proposalId)
      const round = rounds.find((candidate) => candidate.id === found?.roundId)
      if (!found || found.status !== 'OPEN' || round?.status !== 'OPEN') throw new Error('SCHEDULING_CONFLICT')
      if (votes.some((item) => item.proposalId === proposalId && item.userId === userId)) throw new Error('SCHEDULING_CONFLICT')
      votes.push({ proposalId, userId, vote })
    },
    async createFixedSession({ gameId, startsAt, endsAt, notes }) {
      const created = session(gameId, null, startsAt, endsAt, 'SCHEDULED', notes)
      sessions.push(created)
      return created
    },
    async selectProposal({ gameId, proposalId, now }) {
      const selected = proposal(proposalId)
      if (!selected || selected.gameId !== gameId) throw new Error('SCHEDULING_NOT_FOUND')
      const round = rounds.find((candidate) => candidate.id === selected.roundId)
      if (!round) throw new Error('SCHEDULING_NOT_FOUND')
      const existing = sessions.find((item) => item.proposalId === proposalId)
      if (existing?.status === 'SCHEDULED') return existing
      if (existing || selected.status !== 'OPEN' || round.status !== 'OPEN') throw new Error('SCHEDULING_CONFLICT')
      for (const sibling of proposals.filter((item) => item.roundId === round.id && item.id !== proposalId && item.status === 'OPEN')) {
        sibling.status = 'CLOSED'
        sibling.updatedAt = now
      }
      selected.status = 'SELECTED'
      selected.updatedAt = now
      round.status = 'SELECTED'
      round.updatedAt = now
      const created = session(gameId, proposalId, selected.startsAt, selected.endsAt, 'SCHEDULED', null)
      sessions.push(created)
      return created
    },
    async listPlanning({ userId, from, to }): Promise<PlanningPage> {
      const gameIds = [...members.filter((member) => member.userId === userId).map((member) => member.gameId), ...games.filter((candidate) => candidate.ownerId === userId).map((candidate) => candidate.id)]
      return { items: sessions.filter((item) => gameIds.includes(item.gameId) && item.status !== 'CANCELLED' && (!from || item.endsAt >= from) && (!to || item.startsAt <= to)), from, to }
    },
    setGameStatus(gameId, status) { const candidate = game(gameId); if (candidate) candidate.status = status },
    closeProposal(proposalId) { const candidate = proposal(proposalId); if (candidate) candidate.status = 'CLOSED' },
    async seedSessions(gameId, count) { for (let index = 0; index < count; index += 1) sessions.push(session(gameId, null, new Date(`2026-10-${String(index + 1).padStart(2, '0')}T18:00:00.000Z`), new Date(`2026-10-${String(index + 1).padStart(2, '0')}T19:00:00.000Z`), 'SCHEDULED', null)) },
  }
}

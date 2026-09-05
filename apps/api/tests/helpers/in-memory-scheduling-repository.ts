import type { GameStatus, ProposalStatus, SessionStatus, VoteValue } from '@jdr-hub/shared'
import type { PlanningPage, ProposalRecord, ProposalView, SchedulingGame, SchedulingRepository, SessionRecord } from '../../src/modules/scheduling/repository.js'

type InMemoryGame = SchedulingGame
type VoteRecord = { proposalId: string; userId: string; vote: VoteValue }

export function createInMemorySchedulingRepository(input: { games: InMemoryGame[]; members: Array<{ gameId: string; userId: string }> }): SchedulingRepository & {
  setGameStatus(gameId: string, status: GameStatus): void
  closeProposal(proposalId: string): void
  seedSessions(gameId: string, count: number): Promise<void>
} {
  const games = [...input.games]
  const members = [...input.members]
  const proposals: ProposalRecord[] = []
  const votes: VoteRecord[] = []
  const sessions: SessionRecord[] = []
  let id = 100
  const nextId = () => `00000000-0000-4000-8000-${String(id++).padStart(12, '0')}`
  const game = (gameId: string) => games.find((candidate) => candidate.id === gameId) ?? null
  const proposal = (proposalId: string) => proposals.find((candidate) => candidate.id === proposalId) ?? null
  const toView = (record: ProposalRecord, userId: string): ProposalView => {
    const proposalVotes = votes.filter((vote) => vote.proposalId === record.id)
    return {
      ...record,
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
      const created = slots.map((slot) => ({ id: nextId(), gameId, proposerId, startsAt: new Date(slot.startsAt), endsAt: new Date(slot.endsAt), status: 'OPEN' as ProposalStatus, createdAt: now, updatedAt: now }))
      proposals.push(...created)
      return created
    },
    async listProposals(gameId, userId) { return proposals.filter((item) => item.gameId === gameId).sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime()).map((item) => toView(item, userId)) },
    async findProposal(proposalId) { return proposal(proposalId) },
    async createVote({ proposalId, userId, vote }) {
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
      const existing = sessions.find((item) => item.proposalId === proposalId)
      if (existing) return existing
      if (selected.status !== 'OPEN') throw new Error('SCHEDULING_CONFLICT')
      selected.status = 'SELECTED'
      selected.updatedAt = now
      const created = session(gameId, proposalId, selected.startsAt, selected.endsAt, 'SCHEDULED', null)
      sessions.push(created)
      return created
    },
    async listPlanning({ userId, from, to }): Promise<PlanningPage> {
      const gameIds = members.filter((member) => member.userId === userId).map((member) => member.gameId)
      return { items: sessions.filter((item) => gameIds.includes(item.gameId) && item.status !== 'CANCELLED' && (!from || item.endsAt >= from) && (!to || item.startsAt <= to)), from, to }
    },
    setGameStatus(gameId, status) { const candidate = game(gameId); if (candidate) candidate.status = status },
    closeProposal(proposalId) { const candidate = proposal(proposalId); if (candidate) candidate.status = 'CLOSED' },
    async seedSessions(gameId, count) { for (let index = 0; index < count; index += 1) sessions.push(session(gameId, null, new Date(`2026-10-${String(index + 1).padStart(2, '0')}T18:00:00.000Z`), new Date(`2026-10-${String(index + 1).padStart(2, '0')}T19:00:00.000Z`), 'SCHEDULED', null)) },
  }
}

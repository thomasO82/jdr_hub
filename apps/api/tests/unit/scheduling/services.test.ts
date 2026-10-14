import { describe, expect, it } from 'vitest'
import { castVote } from '../../../src/modules/scheduling/services/cast-vote.js'
import { cancelScheduledSession } from '../../../src/modules/scheduling/services/cancel-scheduled-session.js'
import { createProposals } from '../../../src/modules/scheduling/services/create-proposals.js'
import { createSession } from '../../../src/modules/scheduling/services/create-session.js'
import { getPlanning } from '../../../src/modules/scheduling/services/get-planning.js'
import { listGameSessions } from '../../../src/modules/scheduling/services/list-game-sessions.js'
import { listProposals } from '../../../src/modules/scheduling/services/list-proposals.js'
import { selectProposal } from '../../../src/modules/scheduling/services/select-proposal.js'
import { updateScheduledSession } from '../../../src/modules/scheduling/services/update-scheduled-session.js'
import { createInMemorySchedulingRepository } from '../../helpers/in-memory-scheduling-repository.js'

const ownerId = '00000000-0000-4000-8000-000000000001'
const memberId = '00000000-0000-4000-8000-000000000002'
const outsiderId = '00000000-0000-4000-8000-000000000003'
const gameId = '00000000-0000-4000-8000-000000000010'
const now = new Date('2026-10-01T12:00:00.000Z')
const slot = { startsAt: '2026-10-20T18:00:00.000Z', endsAt: '2026-10-20T21:00:00.000Z' }

function repository() {
  return createInMemorySchedulingRepository({
    games: [{ id: gameId, ownerId, type: 'ONE_SHOT', status: 'ACTIVE', title: 'La crypte' }],
    members: [{ gameId, userId: ownerId }, { gameId, userId: memberId }],
  })
}

describe('scheduling services', () => {
  it('allows the owner to create proposals and exposes vote counters', async () => {
    const repo = repository()
    const created = await createProposals({ gameId, ownerId, slots: [slot], repository: repo, now: () => now })
    expect(created).toHaveLength(1)
    const board = await listProposals({ gameId, userId: memberId, repository: repo })
    expect(board[0]).toMatchObject({ status: 'OPEN', votes: { yes: 0, maybe: 0, no: 0 }, userVote: null })
  })

  it('rejects proposal creation by non-owner or on a closed game', async () => {
    const repo = repository()
    await expect(createProposals({ gameId, ownerId: memberId, slots: [slot], repository: repo, now: () => now })).rejects.toThrow('SCHEDULING_FORBIDDEN')
    repo.setGameStatus(gameId, 'CLOSED')
    await expect(createProposals({ gameId, ownerId, slots: [slot], repository: repo, now: () => now })).rejects.toThrow('SCHEDULING_CONFLICT')
  })

  it('allows one member vote and rejects outsiders, duplicate votes and closed polls', async () => {
    const repo = repository()
    const [proposal] = await createProposals({ gameId, ownerId, slots: [slot], repository: repo, now: () => now })
    await expect(castVote({ proposalId: proposal.id, userId: outsiderId, vote: 'YES', repository: repo, now: () => now })).rejects.toThrow('SCHEDULING_FORBIDDEN')
    await castVote({ proposalId: proposal.id, userId: memberId, vote: 'YES', repository: repo, now: () => now })
    await expect(castVote({ proposalId: proposal.id, userId: memberId, vote: 'MAYBE', repository: repo, now: () => now })).rejects.toThrow('SCHEDULING_CONFLICT')
    repo.closeProposal(proposal.id)
    await expect(castVote({ proposalId: proposal.id, userId: ownerId, vote: 'NO', repository: repo, now: () => now })).rejects.toThrow('SCHEDULING_CONFLICT')
  })

  it('enforces one-shot limit and creates a fixed session', async () => {
    const repo = repository()
    await repo.seedSessions(gameId, 2)
    const session = await createSession({ gameId, ownerId, ...slot, notes: null, repository: repo, now: () => now })
    expect(session.status).toBe('SCHEDULED')
    await expect(createSession({ gameId, ownerId, ...slot, notes: null, repository: repo, now: () => now })).rejects.toThrow('SCHEDULING_CONFLICT')
  })

  it('selects a proposal transactionally and is idempotent', async () => {
    const repo = repository()
    const [proposal] = await createProposals({ gameId, ownerId, slots: [slot], repository: repo, now: () => now })
    const selected = await selectProposal({ gameId, ownerId, proposalId: proposal.id, repository: repo, now: () => now })
    const replay = await selectProposal({ gameId, ownerId, proposalId: proposal.id, repository: repo, now: () => now })
    expect(selected.id).toBe(replay.id)
    expect((await listProposals({ gameId, userId: ownerId, repository: repo }))[0]?.status).toBe('SELECTED')
  })

  it('closes sibling slots and allows a new round without rewriting the previous votes', async () => {
    const repo = repository()
    const slots = [
      slot,
      { startsAt: '2026-10-21T18:00:00.000Z', endsAt: '2026-10-21T21:00:00.000Z' },
    ]
    const [first, second] = await createProposals({ gameId, ownerId, slots, repository: repo, now: () => now })

    expect(first?.roundId).toBe(second?.roundId)
    expect(first?.roundStatus).toBe('OPEN')
    await castVote({ proposalId: first!.id, userId: memberId, vote: 'YES', repository: repo, now: () => now })
    await expect(createProposals({ gameId, ownerId, slots: [slot], repository: repo, now: () => now })).rejects.toThrow('SCHEDULING_CONFLICT')

    await selectProposal({ gameId, ownerId, proposalId: second!.id, repository: repo, now: () => now })
    const history = await listProposals({ gameId, userId: memberId, repository: repo })
    expect(history).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: first!.id, status: 'CLOSED', roundStatus: 'SELECTED', votes: { yes: 1, maybe: 0, no: 0 }, userVote: 'YES' }),
      expect.objectContaining({ id: second!.id, status: 'SELECTED', roundStatus: 'SELECTED' }),
    ]))
    await expect(castVote({ proposalId: first!.id, userId: memberId, vote: 'NO', repository: repo, now: () => now })).rejects.toThrow('SCHEDULING_CONFLICT')

    const replacement = (await createProposals({ gameId, ownerId, slots: [slot], repository: repo, now: () => now })).find((proposal) => proposal.roundStatus === 'OPEN')
    expect(replacement?.roundId).not.toBe(first?.roundId)
    expect(replacement?.roundStatus).toBe('OPEN')
    expect((await listProposals({ gameId, userId: memberId, repository: repo })).find((proposal) => proposal.id === first!.id)?.userVote).toBe('YES')
  })

  it('rejects selecting a fourth one-shot session', async () => {
    const repo = repository()
    await repo.seedSessions(gameId, 3)
    const [proposal] = await createProposals({ gameId, ownerId, slots: [slot], repository: repo, now: () => now })
    await expect(selectProposal({ gameId, ownerId, proposalId: proposal.id, repository: repo, now: () => now })).rejects.toThrow('SCHEDULING_CONFLICT')
  })

  it('returns only the user planning range', async () => {
    const repo = repository()
    await createSession({ gameId, ownerId, ...slot, notes: null, repository: repo, now: () => now })
    const planning = await getPlanning({ userId: memberId, from: new Date('2026-10-01T00:00:00.000Z'), to: new Date('2026-10-31T23:59:59.000Z'), repository: repo })
    expect(planning.items).toHaveLength(1)
    expect(planning.items[0]?.gameTitle).toBe('La crypte')
  })

  it('lets only the owner list sessions and edit scheduled dates without changing vote history', async () => {
    const repo = repository()
    const [proposal] = await createProposals({ gameId, ownerId, slots: [slot], repository: repo, now: () => now })
    await castVote({ proposalId: proposal!.id, userId: memberId, vote: 'YES', repository: repo, now: () => now })
    const session = await selectProposal({ gameId, ownerId, proposalId: proposal!.id, repository: repo, now: () => now })
    const newWindow = { startsAt: '2026-10-22T18:00:00.000Z', endsAt: '2026-10-22T21:00:00.000Z' }

    await expect(listGameSessions({ gameId, ownerId: memberId, repository: repo })).rejects.toThrow('SCHEDULING_FORBIDDEN')
    expect(await listGameSessions({ gameId, ownerId, repository: repo })).toMatchObject([{ id: session.id, status: 'SCHEDULED' }])
    const updated = await updateScheduledSession({ gameId, sessionId: session.id, ownerId, ...newWindow, repository: repo, now: () => now })
    expect(updated).toMatchObject({ startsAt: new Date(newWindow.startsAt), endsAt: new Date(newWindow.endsAt) })
    expect((await listProposals({ gameId, userId: memberId, repository: repo }))[0]).toMatchObject({ startsAt: new Date(slot.startsAt), votes: { yes: 1 }, userVote: 'YES' })
  })

  it('cancels a scheduled session, preserves the poll, and permits a replacement date', async () => {
    const repo = repository()
    const [proposal] = await createProposals({ gameId, ownerId, slots: [slot], repository: repo, now: () => now })
    await castVote({ proposalId: proposal!.id, userId: memberId, vote: 'YES', repository: repo, now: () => now })
    const session = await selectProposal({ gameId, ownerId, proposalId: proposal!.id, repository: repo, now: () => now })

    const cancelled = await cancelScheduledSession({ gameId, sessionId: session.id, ownerId, repository: repo, now: () => now })
    expect(cancelled.status).toBe('CANCELLED')
    expect(await getPlanning({ userId: memberId, from: null, to: null, repository: repo })).toMatchObject({ items: [] })
    expect((await listProposals({ gameId, userId: memberId, repository: repo }))[0]).toMatchObject({ status: 'SELECTED', roundStatus: 'CANCELLED', votes: { yes: 1 }, userVote: 'YES' })
    await expect(updateScheduledSession({ gameId, sessionId: session.id, ownerId, ...slot, repository: repo, now: () => now })).rejects.toThrow('SCHEDULING_CONFLICT')
    await expect(cancelScheduledSession({ gameId, sessionId: session.id, ownerId, repository: repo, now: () => now })).rejects.toThrow('SCHEDULING_CONFLICT')

    const replacement = await createSession({ gameId, ownerId, ...slot, notes: null, repository: repo, now: () => now })
    expect(replacement.status).toBe('SCHEDULED')
  })

  it('rejects edits and cancellation for completed sessions and releases one-shot capacity after cancellation', async () => {
    const repo = repository()
    const completed = await repo.createFixedSession({ gameId, ...{ startsAt: new Date(slot.startsAt), endsAt: new Date(slot.endsAt) }, notes: null, now })
    repo.setSessionStatus(completed.id, 'COMPLETED')
    await expect(updateScheduledSession({ gameId, sessionId: completed.id, ownerId, ...slot, repository: repo, now: () => now })).rejects.toThrow('SCHEDULING_CONFLICT')
    await expect(cancelScheduledSession({ gameId, sessionId: completed.id, ownerId, repository: repo, now: () => now })).rejects.toThrow('SCHEDULING_CONFLICT')

    const oneShotRepo = repository()
    await oneShotRepo.seedSessions(gameId, 2)
    const scheduled = await createSession({ gameId, ownerId, ...slot, notes: null, repository: oneShotRepo, now: () => now })
    await cancelScheduledSession({ gameId, sessionId: scheduled.id, ownerId, repository: oneShotRepo, now: () => now })
    expect((await createSession({ gameId, ownerId, ...slot, notes: null, repository: oneShotRepo, now: () => now })).status).toBe('SCHEDULED')
  })
})

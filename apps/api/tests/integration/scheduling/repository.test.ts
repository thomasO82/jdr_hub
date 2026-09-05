import { describe, expect, it } from 'vitest'
import { createInMemorySchedulingRepository } from '../../helpers/in-memory-scheduling-repository.js'

const ownerId = '00000000-0000-4000-8000-000000000001'
const memberId = '00000000-0000-4000-8000-000000000002'
const gameId = '00000000-0000-4000-8000-000000000010'

describe('scheduling repository invariants', () => {
  it('enforces one vote per proposal and keeps selection idempotent', async () => {
    const repository = createInMemorySchedulingRepository({ games: [{ id: gameId, ownerId, title: 'La crypte', type: 'CAMPAIGN', status: 'ACTIVE' }], members: [{ gameId, userId: ownerId }, { gameId, userId: memberId }] })
    const [proposal] = await repository.createProposals({ gameId, proposerId: ownerId, slots: [{ startsAt: '2026-10-20T18:00:00.000Z', endsAt: '2026-10-20T21:00:00.000Z' }], now: new Date('2026-10-01T00:00:00.000Z') })
    await repository.createVote({ proposalId: proposal.id, userId: memberId, vote: 'YES', now: new Date() })
    await expect(repository.createVote({ proposalId: proposal.id, userId: memberId, vote: 'NO', now: new Date() })).rejects.toThrow('SCHEDULING_CONFLICT')
    const first = await repository.selectProposal({ gameId, proposalId: proposal.id, now: new Date() })
    const second = await repository.selectProposal({ gameId, proposalId: proposal.id, now: new Date() })
    expect(second.id).toBe(first.id)
  })
})

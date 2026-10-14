import { describe, expect, it } from 'vitest'
import type { SchedulingProposal } from '@jdr-hub/shared'
import { canCastVote, proposalVoteStatusLabel } from '../features/scheduling/proposal-vote-policy.js'

const openProposal: SchedulingProposal = {
  id: 'proposal-open',
  gameId: 'game-1',
  roundId: 'round-open',
  roundStatus: 'OPEN',
  startsAt: '2026-10-20T18:00:00.000Z',
  endsAt: '2026-10-20T21:00:00.000Z',
  status: 'OPEN',
  votes: { yes: 0, maybe: 0, no: 0 },
  userVote: null,
}

const closedProposal: SchedulingProposal = {
  ...openProposal,
  id: 'proposal-closed',
  roundStatus: 'SELECTED',
  status: 'CLOSED',
}

describe('proposal vote availability', () => {
  it('allows voting only on an open proposal in an open round', () => {
    expect(canCastVote(openProposal)).toBe(true)
    expect(canCastVote(closedProposal)).toBe(false)
  })

  it('rejects a proposal that is open but belongs to a closed round', () => {
    expect(canCastVote({ ...openProposal, roundStatus: 'CANCELLED' })).toBe(false)
  })

  it('rejects a proposal closed within an otherwise open round', () => {
    expect(canCastVote({ ...openProposal, status: 'CLOSED' })).toBe(false)
  })

  it('does not allow a second vote from the same user', () => {
    expect(canCastVote({ ...openProposal, userVote: 'YES' })).toBe(false)
  })

  it('labels closed and selected rounds in French', () => {
    expect(proposalVoteStatusLabel(closedProposal)).toBe('Vote clôturé')
    expect(proposalVoteStatusLabel({ ...closedProposal, status: 'SELECTED' })).toBe('Créneau retenu')
    expect(proposalVoteStatusLabel({ ...closedProposal, status: 'SELECTED', roundStatus: 'CANCELLED' })).toBe('Séance annulée')
    expect(proposalVoteStatusLabel({ ...openProposal, roundStatus: 'CLOSED' })).toBe('Vote clôturé')
    expect(proposalVoteStatusLabel(openProposal)).toBeNull()
  })
})

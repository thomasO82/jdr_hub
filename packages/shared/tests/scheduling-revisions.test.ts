import { describe, expect, it } from 'vitest'
import type { SchedulingProposal } from '../src/scheduling.js'
import { proposalRoundStatusSchema, sessionManagementCommandSchema, sessionUpdateInputSchema } from '../src/scheduling.js'

const validWindow = {
  startsAt: '2026-10-20T18:00:00.000Z',
  endsAt: '2026-10-20T21:00:00.000Z',
}

describe('scheduling revision contracts', () => {
  it('represents a proposal as part of a round with its current round state', () => {
    const proposal: SchedulingProposal = {
      id: '00000000-0000-4000-8000-000000000001',
      gameId: '00000000-0000-4000-8000-000000000002',
      roundId: '00000000-0000-4000-8000-000000000003',
      startsAt: validWindow.startsAt,
      endsAt: validWindow.endsAt,
      status: 'OPEN',
      roundStatus: 'OPEN',
      votes: { yes: 1, maybe: 0, no: 0 },
      userVote: 'YES',
    }

    expect(proposal.roundStatus).toBe('OPEN')
    expect(proposal.roundId).toBe('00000000-0000-4000-8000-000000000003')
    expect(proposalRoundStatusSchema.parse('CANCELLED')).toBe('CANCELLED')
    expect(() => proposalRoundStatusSchema.parse('REOPENED')).toThrow()
  })

  it('accepts only valid session updates or an explicit cancellation command', () => {
    expect(sessionUpdateInputSchema.parse(validWindow)).toEqual(validWindow)
    expect(sessionManagementCommandSchema.parse({ status: 'CANCELLED' })).toEqual({ status: 'CANCELLED' })
    expect(sessionManagementCommandSchema.parse(validWindow)).toEqual(validWindow)
    expect(() => sessionManagementCommandSchema.parse({ ...validWindow, ownerId: 'forged' })).toThrow()
    expect(() => sessionManagementCommandSchema.parse({ status: 'COMPLETED' })).toThrow()
  })

  it('rejects inverted, too short, and overlong session updates', () => {
    expect(() => sessionUpdateInputSchema.parse({ startsAt: validWindow.endsAt, endsAt: validWindow.startsAt })).toThrow()
    expect(() => sessionUpdateInputSchema.parse({ startsAt: validWindow.startsAt, endsAt: '2026-10-20T18:10:00.000Z' })).toThrow()
    expect(() => sessionUpdateInputSchema.parse({ startsAt: validWindow.startsAt, endsAt: '2026-10-21T18:01:00.000Z' })).toThrow()
  })
})

import { describe, expect, it } from 'vitest'
import {
  fixedSessionInputSchema,
  planningQuerySchema,
  proposalInputSchema,
  proposalStatusSchema,
  sessionStatusSchema,
  sessionWindowSchema,
  voteValueSchema,
} from '../src/scheduling.js'

const validWindow = {
  startsAt: '2026-10-20T18:00:00.000Z',
  endsAt: '2026-10-20T21:00:00.000Z',
}

describe('scheduling shared contracts', () => {
  it('accepts supported statuses and votes', () => {
    expect(sessionStatusSchema.parse('SCHEDULED')).toBe('SCHEDULED')
    expect(proposalStatusSchema.parse('OPEN')).toBe('OPEN')
    expect(voteValueSchema.parse('MAYBE')).toBe('MAYBE')
  })

  it('validates an ordered bounded UTC window', () => {
    expect(sessionWindowSchema.parse(validWindow)).toEqual(validWindow)
    expect(() => sessionWindowSchema.parse({ startsAt: validWindow.endsAt, endsAt: validWindow.startsAt })).toThrow()
    expect(() => sessionWindowSchema.parse({ startsAt: '2026-10-20T18:00:00.000Z', endsAt: '2026-10-22T18:01:00.000Z' })).toThrow()
    expect(() => sessionWindowSchema.parse({ ...validWindow, notes: 'forged' })).toThrow()
  })

  it('bounds proposal lists and fixed-session notes', () => {
    expect(proposalInputSchema.parse({ slots: [validWindow] })).toEqual({ slots: [validWindow] })
    expect(() => proposalInputSchema.parse({ slots: [] })).toThrow()
    expect(() => proposalInputSchema.parse({ slots: Array.from({ length: 11 }, () => validWindow) })).toThrow()
    expect(fixedSessionInputSchema.parse({ ...validWindow, notes: null })).toEqual({ ...validWindow, notes: null })
    expect(() => fixedSessionInputSchema.parse({ ...validWindow, notes: 'x'.repeat(2_001) })).toThrow()
  })

  it('accepts a bounded planning range and rejects unknown fields', () => {
    expect(planningQuerySchema.parse({ from: '2026-10-01T00:00:00.000Z', to: '2026-10-31T23:59:59.000Z' })).toMatchObject({ from: '2026-10-01T00:00:00.000Z' })
    expect(() => planningQuerySchema.parse({ from: '2026-10-31T00:00:00.000Z', to: '2026-10-01T00:00:00.000Z' })).toThrow()
    expect(() => planningQuerySchema.parse({ from: '2026-01-01T00:00:00.000Z', to: '2026-04-01T00:00:00.000Z' })).toThrow()
    expect(() => planningQuerySchema.parse({ from: '2026-10-01T00:00:00.000Z', to: '2026-10-02T00:00:00.000Z', userId: 'forged' })).toThrow()
  })
})

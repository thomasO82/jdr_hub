import { describe, expect, it } from 'vitest'
import { canCreateSession } from '../../../src/modules/scheduling/policy.js'

describe('scheduling policy', () => {
  it('limits one-shot sessions to three and rejects closed games', () => {
    expect(canCreateSession({ type: 'ONE_SHOT', status: 'ACTIVE' }, 2)).toBe(true)
    expect(canCreateSession({ type: 'ONE_SHOT', status: 'ACTIVE' }, 3)).toBe(false)
    expect(canCreateSession({ type: 'CAMPAIGN', status: 'ACTIVE' }, 30)).toBe(true)
    expect(canCreateSession({ type: 'CAMPAIGN', status: 'CLOSED' }, 0)).toBe(false)
    expect(canCreateSession({ type: 'ONE_SHOT', status: 'COMPLETED' }, 0)).toBe(false)
  })
})

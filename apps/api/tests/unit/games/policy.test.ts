import { describe, expect, it } from 'vitest'
import { canTransitionGameStatus, maxSessionsFor, slugifyGameTitle } from '../../../src/modules/games/policy.js'

describe('game policy', () => {
  it('normalizes human titles into stable slugs', () => {
    expect(slugifyGameTitle('  La Crypte Maudite ! ')).toBe('la-crypte-maudite')
  })

  it('keeps one-shot and campaign session rules distinct', () => {
    expect(maxSessionsFor('ONE_SHOT')).toBe(3)
    expect(maxSessionsFor('CAMPAIGN')).toBeNull()
  })

  it('allows only explicit lifecycle transitions', () => {
    expect(canTransitionGameStatus('DRAFT', 'OPEN')).toBe(true)
    expect(canTransitionGameStatus('COMPLETED', 'OPEN')).toBe(false)
  })
})

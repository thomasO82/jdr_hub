import { describe, expect, it } from 'vitest'
import { schedulingActionHref } from '../features/dashboard/scheduling-action-href.js'

describe('schedulingActionHref', () => {
  it('links pending votes to the party vote screen', () => {
    expect(schedulingActionHref({ kind: 'VOTE', gameId: 'game-123' })).toBe('/parties/game-123/vote')
  })

  it('does not turn session actions into vote links', () => {
    expect(schedulingActionHref({ kind: 'SESSION', gameId: 'game-123' })).toBeNull()
  })
})

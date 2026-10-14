import { describe, expect, it } from 'vitest'
import { createdGameDestination, gameCreationErrorMessage } from '../features/games/game-creation-feedback'

describe('game creation feedback', () => {
  it('only describes an authentication problem for an unauthenticated response', () => {
    expect(gameCreationErrorMessage(401)).toContain('Connectez-vous')
    expect(gameCreationErrorMessage(400, 'INVALID_GAME_TAG')).toContain('tag')
    expect(gameCreationErrorMessage(409, 'GAME_ERROR')).not.toContain('Connectez-vous')
  })

  it('opens public games and sends private games to their owner workspace', () => {
    expect(createdGameDestination({ id: 'game id', slug: 'crypte', visibility: 'PUBLIC' })).toBe('/parties/crypte')
    expect(createdGameDestination({ id: 'game id', slug: 'crypte', visibility: 'PRIVATE' })).toBe('/gestion/parties/game%20id')
  })
})

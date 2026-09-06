import { describe, expect, it } from 'vitest'
import type { Application } from '@jdr-hub/shared'
import { findApplicationForGame } from '../features/applications/application-state'

const application = (gameId: string): Application => ({
  id: 'application-1',
  gameId,
  gameTitle: 'La crypte maudite',
  userId: 'user-1',
  username: 'Joueur fictif',
  message: null,
  status: 'PENDING',
  createdAt: new Date('2026-09-06T10:00:00.000Z'),
  updatedAt: new Date('2026-09-06T10:00:00.000Z'),
})

describe('application state for a game detail', () => {
  it('returns the existing application for the displayed game', () => {
    expect(findApplicationForGame([application('game-1')], 'game-1')).toEqual(application('game-1'))
  })

  it('does not hide the form for an application belonging to another game', () => {
    expect(findApplicationForGame([application('game-2')], 'game-1')).toBeNull()
  })
})

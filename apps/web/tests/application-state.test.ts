import { describe, expect, it } from 'vitest'
import type { Application, ApplicationViewerState } from '@jdr-hub/shared'
import { getApplicationView } from '../features/applications/application-state'

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

describe('application view state for a game detail', () => {
  it('hides the form when the current user owns the game', () => {
    const state: ApplicationViewerState = { canApply: false, application: null }
    expect(getApplicationView(state)).toBe('HIDDEN')
  })

  it('shows the existing application status instead of the form', () => {
    const state: ApplicationViewerState = { canApply: false, application: application('game-1') }
    expect(getApplicationView(state)).toBe('STATUS')
  })

  it('shows the form only when the viewer can apply without an existing application', () => {
    const state: ApplicationViewerState = { canApply: true, application: null }
    expect(getApplicationView(state)).toBe('FORM')
  })
})

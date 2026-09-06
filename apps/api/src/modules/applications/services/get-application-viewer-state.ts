import type { ApplicationViewerState } from '@jdr-hub/shared'
import type { ApplicationRepository } from '../repository.js'

export async function getApplicationViewerState(input: { gameId: string; userId: string; repository: ApplicationRepository }): Promise<ApplicationViewerState> {
  const game = await input.repository.findEligibleGame(input.gameId)
  if (!game || game.visibility !== 'PUBLIC') throw new Error('APPLICATION_NOT_FOUND')

  const application = await input.repository.findByGameAndUser(game.id, input.userId)
  return {
    canApply: game.ownerId !== input.userId && game.status === 'OPEN' && !application,
    application,
  }
}

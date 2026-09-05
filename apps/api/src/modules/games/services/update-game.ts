import type { UpdateGameInput } from '@jdr-hub/shared'
import type { GameRecord, GamesRepository } from '../repository.js'
import { canTransitionGameStatus } from '../policy.js'

export async function updateGame(input: { id: string; ownerId: string; game: UpdateGameInput; repository: GamesRepository }): Promise<GameRecord | null> {
  const current = await input.repository.findById(input.id)
  if (!current || current.ownerId !== input.ownerId) return null
  if (input.game.status && !canTransitionGameStatus(current.status, input.game.status)) throw new Error('GAME_STATUS_TRANSITION_INVALID')
  return input.repository.update(input.id, input.ownerId, input.game)
}

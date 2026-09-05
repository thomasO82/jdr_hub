import type { UpdateGameInput } from '@jdr-hub/shared'
import type { GameRecord, GamesRepository } from '../repository.js'

export async function updateGame(input: { id: string; ownerId: string; game: UpdateGameInput; repository: GamesRepository }): Promise<GameRecord | null> {
  return input.repository.update(input.id, input.ownerId, input.game)
}

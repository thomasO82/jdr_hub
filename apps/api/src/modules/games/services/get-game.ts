import type { GameRecord, GamesRepository } from '../repository.js'

export async function getGame(input: { id: string; repository: GamesRepository }): Promise<GameRecord | null> {
  return input.repository.findById(input.id)
}

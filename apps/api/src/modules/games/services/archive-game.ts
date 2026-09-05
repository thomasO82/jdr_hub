import type { GamesRepository } from '../repository.js'

export async function archiveGame(input: { id: string; ownerId: string; repository: GamesRepository }): Promise<boolean> {
  return input.repository.archive(input.id, input.ownerId)
}

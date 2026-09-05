import type { CreateGameInput } from '@jdr-hub/shared'
import type { GameRecord, GamesRepository } from '../repository.js'
import { slugifyGameTitle } from '../policy.js'

export async function createGame(input: { ownerId: string; game: CreateGameInput; repository: GamesRepository }): Promise<GameRecord> {
  return input.repository.create({ ...input.game, ownerId: input.ownerId, slug: slugifyGameTitle(input.game.title) })
}

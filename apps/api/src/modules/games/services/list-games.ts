import type { GameQuery } from '@jdr-hub/shared'
import type { GamesRepository } from '../repository.js'

export async function listGames(input: { query: GameQuery; repository: GamesRepository }) {
  return input.repository.list(input.query)
}

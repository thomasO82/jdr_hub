import type { PublicGamesQuery } from '@jdr-hub/shared'
import type { PublicGamesRepository } from '../repository.js'

export function listPublicGames(input: { query: PublicGamesQuery; repository: PublicGamesRepository }) {
  return input.repository.listPublic(input.query)
}

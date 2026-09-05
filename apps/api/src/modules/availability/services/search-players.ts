import type { PlayerQuery } from '@jdr-hub/shared'
import type { AvailabilityRepository } from '../repository.js'

export async function searchPlayers(input: { viewerId: string; query: PlayerQuery; repository: AvailabilityRepository }) {
  void input.viewerId
  return input.repository.searchPlayers(input.query)
}

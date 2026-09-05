import type { PublicGame } from '@jdr-hub/shared'
import type { GamesRepository } from '../repository.js'

export async function getPublicGame(input: { slug: string; repository: GamesRepository }): Promise<PublicGame | null> {
  return input.repository.findPublicBySlug(input.slug)
}

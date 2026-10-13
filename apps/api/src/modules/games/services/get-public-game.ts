import type { GameRecord, GamesRepository } from '../repository.js'

export async function getPublicGame(input: { slug: string; repository: GamesRepository }): Promise<GameRecord | null> {
  return input.repository.findPublicBySlug(input.slug)
}

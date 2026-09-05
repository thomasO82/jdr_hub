import type { PublicGamesRepository } from '../repository.js'

export function getPublicCollection(input: { kind: 'gm' | 'tag' | 'system'; slug: string; repository: PublicGamesRepository }) {
  return input.repository.findPublicCollection(input.kind, input.slug)
}

import { randomUUID } from 'node:crypto'
import type { CreateGameInput, GameQuery, UpdateGameInput } from '@jdr-hub/shared'
import type { GameRecord, GamesRepository } from '../../src/modules/games/repository.js'

export function createInMemoryGamesRepository(seed: GameRecord[] = []): GamesRepository {
  const games = new Map(seed.map((game) => [game.id, game]))
  return {
    async create(input) {
      const game: GameRecord = { ...input, id: randomUUID(), status: 'DRAFT', tags: input.tags }
      games.set(game.id, game)
      return game
    },
    async findById(id) { return games.get(id) ?? null },
    async update(id, ownerId, input: UpdateGameInput) {
      const current = games.get(id)
      if (!current || current.ownerId !== ownerId) return null
      const updated = { ...current, ...input, tags: input.tags ?? current.tags }
      games.set(id, updated)
      return updated
    },
    async archive(id, ownerId) {
      const current = games.get(id)
      if (!current || current.ownerId !== ownerId) return false
      games.set(id, { ...current, status: 'CLOSED' })
      return true
    },
    async list(query: GameQuery) {
      const items = [...games.values()].filter((game) => game.visibility === 'PUBLIC' && game.status === 'OPEN')
        .filter((game) => !query.q || game.title.toLowerCase().includes(query.q.toLowerCase()))
        .filter((game) => query.tagSlugs.every((tag) => game.tags.includes(tag)))
      const start = (query.page - 1) * query.pageSize
      return { items: items.slice(start, start + query.pageSize), page: query.page, pageSize: query.pageSize }
    },
    async listActiveTags() { return [{ name: 'Horreur', slug: 'horror' }] },
  }
}

import { randomUUID } from 'node:crypto'
import type { CreateGameInput, GameQuery, PublicCollection, PublicGame, PublicGamesQuery, PublicSlugs, UpdateGameInput } from '@jdr-hub/shared'
import type { GameRecord, GamesRepository, PublicGamesRepository } from '../../src/modules/games/repository.js'
import { slugifyPublicLabel } from '../../src/modules/games/policy.js'

type InMemoryRepository = GamesRepository & PublicGamesRepository

function publicGame(game: GameRecord): PublicGame {
  return {
    slug: game.slug,
    title: game.title,
    system: game.system,
    description: game.description,
    type: game.type,
    status: game.status as PublicGame['status'],
    maxPlayers: game.maxPlayers,
    tags: game.tags.map((slug) => ({ name: slug, slug })),
    gameMaster: { name: game.ownerId, slug: slugifyPublicLabel(game.ownerId) },
  }
}

export function createInMemoryGamesRepository(seed: GameRecord[] = []): InMemoryRepository {
  const games = new Map(seed.map((game) => [game.id, game]))
  return {
    async create(input) {
      const game: GameRecord = { ...input, id: randomUUID(), status: 'DRAFT', tags: input.tags }
      games.set(game.id, game)
      return game
    },
    async findById(id) { return games.get(id) ?? null },
    async findPublicBySlug(slug) {
      const game = [...games.values()].find((value) => value.slug === slug && value.visibility === 'PUBLIC' && ['OPEN', 'ACTIVE'].includes(value.status))
      return game ? publicGame(game) : null
    },
    async listPublic(query: PublicGamesQuery) {
      const items = [...games.values()]
        .filter((game) => game.visibility === 'PUBLIC' && ['OPEN', 'ACTIVE'].includes(game.status))
        .filter((game) => !query.q || game.title.toLowerCase().includes(query.q.toLowerCase()))
        .filter((game) => !query.gmId || game.ownerId === query.gmId)
        .filter((game) => !query.gmName || game.ownerId.toLowerCase().includes(query.gmName.toLowerCase()))
        .filter((game) => query.tagSlugs.every((tag) => game.tags.includes(tag)))
        .map(publicGame)
      const start = (query.page - 1) * query.pageSize
      return { items: items.slice(start, start + query.pageSize), page: query.page, pageSize: query.pageSize }
    },
    async findPublicCollection(kind, slug) {
      const eligible = [...games.values()].filter((game) => game.visibility === 'PUBLIC' && ['OPEN', 'ACTIVE'].includes(game.status))
      let matching: GameRecord[]
      if (kind === 'gm') matching = eligible.filter((game) => slugifyPublicLabel(game.ownerId) === slug)
      else if (kind === 'tag') matching = eligible.filter((game) => game.tags.includes(slug))
      else matching = eligible.filter((game) => slugifyPublicLabel(game.system) === slug)
      if (matching.length === 0) return null
      const name = kind === 'gm' ? matching[0]?.ownerId ?? slug : kind === 'tag' ? slug : matching[0]?.system ?? slug
      const collection: PublicCollection = { slug, name, games: matching.map(publicGame) }
      return collection
    },
    async listPublicSlugs(): Promise<PublicSlugs> {
      const eligible = [...games.values()].filter((game) => game.visibility === 'PUBLIC' && ['OPEN', 'ACTIVE'].includes(game.status))
      return {
        games: eligible.map((game) => game.slug),
        gms: [...new Set(eligible.map((game) => slugifyPublicLabel(game.ownerId)))],
        tags: [...new Set(eligible.flatMap((game) => game.tags))],
        systems: [...new Set(eligible.map((game) => slugifyPublicLabel(game.system)))],
      }
    },
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

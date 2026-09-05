import { and, desc, eq, ilike, inArray, sql } from 'drizzle-orm'
import { authSchema, gameSchema, type createDatabase } from '@jdr-hub/database'
import type { CreateGameInput, GameQuery, UpdateGameInput } from '@jdr-hub/shared'

export type GameRecord = {
  id: string
  ownerId: string
  slug: string
  title: string
  system: string
  description: string
  type: CreateGameInput['type']
  status: 'DRAFT' | 'OPEN' | 'ACTIVE' | 'CLOSED' | 'COMPLETED'
  visibility: CreateGameInput['visibility']
  maxPlayers: number
  tags: string[]
}

export interface GamesRepository {
  create(input: CreateGameInput & { ownerId: string; slug: string }): Promise<GameRecord>
  findById(id: string): Promise<GameRecord | null>
  findPublicBySlug(slug: string): Promise<GameRecord | null>
  update(id: string, ownerId: string, input: UpdateGameInput): Promise<GameRecord | null>
  archive(id: string, ownerId: string): Promise<boolean>
  list(query: GameQuery): Promise<{ items: GameRecord[]; page: number; pageSize: number }>
  listActiveTags(): Promise<Array<{ name: string; slug: string }>>
}

type Database = ReturnType<typeof createDatabase>['db']

export function createPostgresGamesRepository(database: Database): GamesRepository {
  const { games, gameTags, tags } = gameSchema
  const { users } = authSchema
  const readTags = async (gameId: string) => (await database.select({ slug: tags.slug }).from(gameTags).innerJoin(tags, eq(gameTags.tagId, tags.id)).where(eq(gameTags.gameId, gameId))).map((tag) => tag.slug)
  return {
    async create(input) {
      const { tags: tagSlugs, ...gameInput } = input
      const tagRows = tagSlugs.length > 0
        ? await database.select({ id: tags.id, slug: tags.slug }).from(tags).where(and(eq(tags.isActive, true), inArray(tags.slug, tagSlugs)))
        : []
      if (tagRows.length !== new Set(tagSlugs).size) throw new Error('GAME_TAG_INVALID')
      const [game] = await database.insert(games).values(gameInput).returning()
      if (!game) throw new Error('GAME_CREATE_FAILED')
      if (tagSlugs.length > 0) {
        await database.insert(gameTags).values(tagRows.map((tag) => ({ gameId: game.id, tagId: tag.id })))
      }
      return { ...game, type: game.type as GameRecord['type'], status: game.status as GameRecord['status'], visibility: game.visibility as GameRecord['visibility'], tags: tagSlugs }
    },
    async findById(id) {
      const [game] = await database.select().from(games).where(eq(games.id, id)).limit(1)
      if (!game) return null
      return { ...game, type: game.type as GameRecord['type'], status: game.status as GameRecord['status'], visibility: game.visibility as GameRecord['visibility'], tags: await readTags(id) }
    },
    async findPublicBySlug(slug) {
      const [game] = await database.select().from(games).where(and(
        eq(games.slug, slug),
        eq(games.visibility, 'PUBLIC'),
        inArray(games.status, ['OPEN', 'ACTIVE']),
      )).limit(1)
      if (!game) return null
      return { ...game, type: game.type as GameRecord['type'], status: game.status as GameRecord['status'], visibility: game.visibility as GameRecord['visibility'], tags: await readTags(game.id) }
    },
    async update(id, ownerId, input) {
      const { tags: _tags, ...gameInput } = input
      const [game] = await database.update(games).set({ ...gameInput, updatedAt: new Date() }).where(and(eq(games.id, id), eq(games.ownerId, ownerId))).returning()
      if (!game) return null
      if (input.tags) {
        await database.delete(gameTags).where(eq(gameTags.gameId, id))
        const tagRows = await database.select({ id: tags.id }).from(tags).where(and(eq(tags.isActive, true), inArray(tags.slug, input.tags)))
        if (tagRows.length > 0) await database.insert(gameTags).values(tagRows.map((tag) => ({ gameId: id, tagId: tag.id })))
      }
      return { ...game, type: game.type as GameRecord['type'], status: game.status as GameRecord['status'], visibility: game.visibility as GameRecord['visibility'], tags: await readTags(id) }
    },
    async archive(id, ownerId) {
      const result = await database.update(games).set({ status: 'CLOSED', updatedAt: new Date() }).where(and(eq(games.id, id), eq(games.ownerId, ownerId))).returning({ id: games.id })
      return result.length > 0
    },
    async list(query) {
      const conditions = [eq(games.visibility, 'PUBLIC'), eq(games.status, 'OPEN')]
      if (query.q) conditions.push(ilike(games.title, `%${query.q}%`))
      if (query.gmId) conditions.push(eq(games.ownerId, query.gmId))
      if (query.gmName) {
        const matchingOwners = await database.select({ id: users.id }).from(users).where(ilike(users.username, `%${query.gmName}%`))
        if (matchingOwners.length === 0) return { page: query.page, pageSize: query.pageSize, items: [] }
        conditions.push(inArray(games.ownerId, matchingOwners.map((owner) => owner.id)))
      }
      if (query.tagSlugs.length > 0) {
        const matching = await database.select({ gameId: gameTags.gameId }).from(gameTags)
          .innerJoin(tags, eq(gameTags.tagId, tags.id))
          .where(and(eq(tags.isActive, true), inArray(tags.slug, query.tagSlugs)))
          .groupBy(gameTags.gameId)
          .having(sql`count(distinct ${tags.slug}) = ${query.tagSlugs.length}`)
        if (matching.length === 0) return { page: query.page, pageSize: query.pageSize, items: [] }
        conditions.push(inArray(games.id, matching.map((row) => row.gameId)))
      }
      const rows = await database.select().from(games).where(and(...conditions)).orderBy(desc(games.createdAt)).limit(query.pageSize).offset((query.page - 1) * query.pageSize)
      const items = await Promise.all(rows.map(async (game) => ({ ...game, type: game.type as GameRecord['type'], status: game.status as GameRecord['status'], visibility: game.visibility as GameRecord['visibility'], tags: await readTags(game.id) })))
      return { page: query.page, pageSize: query.pageSize, items }
    },
    async listActiveTags() {
      return database.select({ name: tags.name, slug: tags.slug }).from(tags).where(eq(tags.isActive, true)).orderBy(tags.name)
    },
  }
}

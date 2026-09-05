import { and, desc, eq, ilike, inArray, sql } from 'drizzle-orm'
import { authSchema, gameSchema, type createDatabase } from '@jdr-hub/database'
import type { CreateGameInput, GameQuery, PublicCollection, PublicGame, PublicGamesPage, PublicGamesQuery, PublicSlugs, UpdateGameInput } from '@jdr-hub/shared'
import { slugifyPublicLabel } from './policy.js'

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

export interface PublicGamesRepository {
  listPublic(query: PublicGamesQuery): Promise<PublicGamesPage>
  findPublicBySlug(slug: string): Promise<PublicGame | null>
  findPublicCollection(kind: 'gm' | 'tag' | 'system', slug: string): Promise<PublicCollection | null>
  listPublicSlugs(): Promise<PublicSlugs>
}

export interface GamesRepository {
  create(input: CreateGameInput & { ownerId: string; slug: string }): Promise<GameRecord>
  findById(id: string): Promise<GameRecord | null>
  findPublicBySlug(slug: string): Promise<PublicGame | null>
  update(id: string, ownerId: string, input: UpdateGameInput): Promise<GameRecord | null>
  archive(id: string, ownerId: string): Promise<boolean>
  list(query: GameQuery): Promise<{ items: GameRecord[]; page: number; pageSize: number }>
  listActiveTags(): Promise<Array<{ name: string; slug: string }>>
}

type Database = ReturnType<typeof createDatabase>['db']

export function createPostgresGamesRepository(database: Database): GamesRepository & PublicGamesRepository {
  const { games, gameTags, tags } = gameSchema
  const { users } = authSchema
  const readTagSlugs = async (gameId: string) => (await database.select({ slug: tags.slug }).from(gameTags).innerJoin(tags, eq(gameTags.tagId, tags.id)).where(eq(gameTags.gameId, gameId))).map((tag) => tag.slug)
  const readTags = async (gameId: string) => (await database.select({ name: tags.name, slug: tags.slug }).from(gameTags).innerJoin(tags, eq(gameTags.tagId, tags.id)).where(and(eq(gameTags.gameId, gameId), eq(tags.isActive, true)))).map((tag) => tag)
  const publicCondition = (slug: string) => and(
    eq(games.slug, slug),
    eq(games.visibility, 'PUBLIC'),
    inArray(games.status, ['OPEN', 'ACTIVE']),
  )
  const toPublicGame = async (game: { slug: string; title: string; system: string; description: string; type: string; status: string; maxPlayers: number; ownerName: string; id: string }): Promise<PublicGame> => ({
    slug: game.slug,
    title: game.title,
    system: game.system,
    description: game.description,
    type: game.type as PublicGame['type'],
    status: game.status as PublicGame['status'],
    maxPlayers: game.maxPlayers,
    tags: await readTags(game.id),
    gameMaster: { name: game.ownerName, slug: slugifyPublicLabel(game.ownerName) },
  })
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
      return { ...game, type: game.type as GameRecord['type'], status: game.status as GameRecord['status'], visibility: game.visibility as GameRecord['visibility'], tags: await readTagSlugs(id) }
    },
    async findPublicBySlug(slug) {
      const [game] = await database.select({
        id: games.id,
        slug: games.slug,
        title: games.title,
        system: games.system,
        description: games.description,
        type: games.type,
        status: games.status,
        maxPlayers: games.maxPlayers,
        ownerName: users.username,
      }).from(games).innerJoin(users, eq(games.ownerId, users.id)).where(publicCondition(slug)).limit(1)
      if (!game) return null
      return toPublicGame(game)
    },
    async listPublic(query) {
      const conditions = [eq(games.visibility, 'PUBLIC'), inArray(games.status, ['OPEN', 'ACTIVE'])]
      if (query.q) conditions.push(ilike(games.title, `%${query.q}%`))
      if (query.gmId) conditions.push(eq(games.ownerId, query.gmId))
      if (query.gmName) conditions.push(ilike(users.username, `%${query.gmName}%`))
      if (query.tagSlugs.length > 0) {
        const matching = await database.select({ gameId: gameTags.gameId }).from(gameTags)
          .innerJoin(tags, eq(gameTags.tagId, tags.id))
          .where(and(eq(tags.isActive, true), inArray(tags.slug, query.tagSlugs)))
          .groupBy(gameTags.gameId)
          .having(sql`count(distinct ${tags.slug}) = ${query.tagSlugs.length}`)
        if (matching.length === 0) return { page: query.page, pageSize: query.pageSize, items: [] }
        conditions.push(inArray(games.id, matching.map((row) => row.gameId)))
      }
      const rows = await database.select({
        id: games.id,
        slug: games.slug,
        title: games.title,
        system: games.system,
        description: games.description,
        type: games.type,
        status: games.status,
        maxPlayers: games.maxPlayers,
        ownerName: users.username,
      }).from(games).innerJoin(users, eq(games.ownerId, users.id)).where(and(...conditions)).orderBy(desc(games.createdAt)).limit(query.pageSize).offset((query.page - 1) * query.pageSize)
      return { page: query.page, pageSize: query.pageSize, items: await Promise.all(rows.map(toPublicGame)) }
    },
    async findPublicCollection(kind, slug) {
      const eligible = and(eq(games.visibility, 'PUBLIC'), inArray(games.status, ['OPEN', 'ACTIVE']))
      if (kind === 'gm') {
        const owners = await database.select({ id: users.id, name: users.username }).from(users)
        const matching = owners.filter((owner) => slugifyPublicLabel(owner.name) === slug)
        if (matching.length === 0) return null
        const rows = await database.select({
          id: games.id, slug: games.slug, title: games.title, system: games.system,
          description: games.description, type: games.type, status: games.status,
          maxPlayers: games.maxPlayers, ownerName: users.username,
        }).from(games).innerJoin(users, eq(games.ownerId, users.id)).where(and(eligible, inArray(games.ownerId, matching.map((owner) => owner.id))))
        return { slug, name: matching[0]?.name ?? slug, games: await Promise.all(rows.map(toPublicGame)) }
      }
      if (kind === 'tag') {
        const [tag] = await database.select({ name: tags.name, slug: tags.slug }).from(tags).where(and(eq(tags.slug, slug), eq(tags.isActive, true))).limit(1)
        if (!tag) return null
        const [tagId] = await database.select({ id: tags.id }).from(tags).where(eq(tags.slug, slug)).limit(1)
        const rows = await database.select({
          id: games.id, slug: games.slug, title: games.title, system: games.system,
          description: games.description, type: games.type, status: games.status,
          maxPlayers: games.maxPlayers, ownerName: users.username,
        }).from(games).innerJoin(users, eq(games.ownerId, users.id)).innerJoin(gameTags, eq(gameTags.gameId, games.id)).where(and(eligible, eq(gameTags.tagId, tagId?.id ?? '')))
        return { slug: tag.slug, name: tag.name, games: await Promise.all(rows.map(toPublicGame)) }
      }
      const systems = await database.select({ system: games.system }).from(games).where(eligible).groupBy(games.system)
      const names = systems.map((row) => row.system).filter((name) => slugifyPublicLabel(name) === slug)
      if (names.length === 0) return null
      const rows = await database.select({
        id: games.id, slug: games.slug, title: games.title, system: games.system,
        description: games.description, type: games.type, status: games.status,
        maxPlayers: games.maxPlayers, ownerName: users.username,
      }).from(games).innerJoin(users, eq(games.ownerId, users.id)).where(and(eligible, inArray(games.system, names)))
      return { slug, name: names[0] ?? slug, games: await Promise.all(rows.map(toPublicGame)) }
    },
    async listPublicSlugs() {
      const [gameRows, ownerRows, tagRows, systemRows] = await Promise.all([
        database.select({ slug: games.slug }).from(games).where(and(eq(games.visibility, 'PUBLIC'), inArray(games.status, ['OPEN', 'ACTIVE']))),
        database.select({ name: users.username }).from(users).where(sql`exists (select 1 from games where games.owner_id = ${users.id} and games.visibility = 'PUBLIC' and games.status in ('OPEN', 'ACTIVE'))`),
        database.select({ slug: tags.slug }).from(gameTags).innerJoin(games, eq(gameTags.gameId, games.id)).innerJoin(tags, eq(gameTags.tagId, tags.id)).where(and(eq(tags.isActive, true), eq(games.visibility, 'PUBLIC'), inArray(games.status, ['OPEN', 'ACTIVE']))).groupBy(tags.slug),
        database.select({ system: games.system }).from(games).where(and(eq(games.visibility, 'PUBLIC'), inArray(games.status, ['OPEN', 'ACTIVE']))).groupBy(games.system),
      ])
      return {
        games: gameRows.map((row) => row.slug),
        gms: [...new Set(ownerRows.map((row) => slugifyPublicLabel(row.name)))],
        tags: tagRows.map((row) => row.slug),
        systems: [...new Set(systemRows.map((row) => slugifyPublicLabel(row.system)))],
      }
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
      return { ...game, type: game.type as GameRecord['type'], status: game.status as GameRecord['status'], visibility: game.visibility as GameRecord['visibility'], tags: await readTagSlugs(id) }
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
      const items = await Promise.all(rows.map(async (game) => ({ ...game, type: game.type as GameRecord['type'], status: game.status as GameRecord['status'], visibility: game.visibility as GameRecord['visibility'], tags: await readTagSlugs(game.id) })))
      return { page: query.page, pageSize: query.pageSize, items }
    },
    async listActiveTags() {
      return database.select({ name: tags.name, slug: tags.slug }).from(tags).where(eq(tags.isActive, true)).orderBy(tags.name)
    },
  }
}

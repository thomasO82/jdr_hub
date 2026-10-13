import { and, desc, eq, lt, or } from 'drizzle-orm'
import { authSchema, gameMessagesSchema, gameSchema, type createDatabase } from '@jdr-hub/database'
import type { GameStatus } from '@jdr-hub/shared'
import { canReadGameMessages, canWriteGameMessages } from './policy.js'

export type MessageAccess = {
  gameId: string
  gameStatus: GameStatus
  isOwner: boolean
  memberStatus: string
  canRead: boolean
  canWrite: boolean
}

export type MessageRecord = {
  id: string
  gameId: string
  authorId: string
  authorName: string
  authorAvatarUrl: string | null
  content: string
  createdAt: Date
}

export interface GameMessageRepository {
  getAccess(input: { gameIdOrSlug: string; userId: string }): Promise<MessageAccess | null>
  list(input: { gameId: string; userId: string; cursor: string | null; limit: number }): Promise<{ items: MessageRecord[]; nextCursor: string | null }>
  findById(input: { gameId: string; messageId: string }): Promise<MessageRecord | null>
  create(input: { gameIdOrSlug: string; authorId: string; content: string; now: Date }): Promise<MessageRecord>
}

type Database = ReturnType<typeof createDatabase>['db']

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const encodeCursor = (message: Pick<MessageRecord, 'id' | 'createdAt'>): string => Buffer.from(JSON.stringify({ id: message.id, createdAt: message.createdAt.toISOString() }), 'utf8').toString('base64url')

const decodeCursor = (cursor: string | null): { id: string; createdAt: Date } | null => {
  if (!cursor) return null
  try {
    const parsed: unknown = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'))
    if (!parsed || typeof parsed !== 'object' || !('id' in parsed) || !('createdAt' in parsed) || typeof parsed.id !== 'string' || parsed.id.length === 0 || typeof parsed.createdAt !== 'string') return null
    const createdAt = new Date(parsed.createdAt)
    return Number.isNaN(createdAt.getTime()) ? null : { id: parsed.id, createdAt }
  } catch {
    return null
  }
}

const toMessage = (row: { id: string; gameId: string; authorId: string; authorName: string; authorAvatarUrl: string | null; content: string; createdAt: Date }): MessageRecord => row

export function createPostgresGameMessageRepository(database: Database): GameMessageRepository {
  const { users } = authSchema
  const { gameMessages } = gameMessagesSchema
  const { games, gameMembers } = gameSchema

  const findGame = async (db: Pick<Database, 'select'>, gameIdOrSlug: string) => {
    const condition = UUID_PATTERN.test(gameIdOrSlug)
      ? or(eq(games.id, gameIdOrSlug), eq(games.slug, gameIdOrSlug))
      : eq(games.slug, gameIdOrSlug)
    const [game] = await db.select({ id: games.id, ownerId: games.ownerId, status: games.status }).from(games).where(condition).limit(1)
    return game ?? null
  }

  const readAccess = async (db: Pick<Database, 'select'>, gameIdOrSlug: string, userId: string): Promise<MessageAccess | null> => {
    const game = await findGame(db, gameIdOrSlug)
    if (!game) return null
    const [member] = await db.select({ status: gameMembers.status }).from(gameMembers).where(and(eq(gameMembers.gameId, game.id), eq(gameMembers.userId, userId))).limit(1)
    const policyInput = {
      gameStatus: game.status as GameStatus,
      isOwner: game.ownerId === userId,
      memberStatus: member?.status ?? 'NONE',
    }
    return {
      gameId: game.id,
      gameStatus: policyInput.gameStatus,
      isOwner: policyInput.isOwner,
      memberStatus: policyInput.memberStatus,
      canRead: canReadGameMessages(policyInput),
      canWrite: canWriteGameMessages(policyInput),
    }
  }

  const readMessage = async (db: Pick<Database, 'select'>, gameId: string, messageId: string): Promise<MessageRecord | null> => {
    const [row] = await db.select({
      id: gameMessages.id,
      gameId: gameMessages.gameId,
      authorId: gameMessages.authorId,
      authorName: users.username,
      authorAvatarUrl: users.avatarUrl,
      content: gameMessages.content,
      createdAt: gameMessages.createdAt,
    }).from(gameMessages).innerJoin(users, eq(gameMessages.authorId, users.id)).where(and(eq(gameMessages.gameId, gameId), eq(gameMessages.id, messageId))).limit(1)
    return row ? toMessage(row) : null
  }

  return {
    async getAccess({ gameIdOrSlug, userId }) {
      return readAccess(database, gameIdOrSlug, userId)
    },

    async list({ gameId, cursor, limit }) {
      const decoded = decodeCursor(cursor)
      if (cursor && !decoded) throw new Error('MESSAGE_INVALID_CURSOR')
      const cursorCondition = decoded
        ? or(lt(gameMessages.createdAt, decoded.createdAt), and(eq(gameMessages.createdAt, decoded.createdAt), lt(gameMessages.id, decoded.id)))
        : undefined
      const rows = await database.select({
        id: gameMessages.id,
        gameId: gameMessages.gameId,
        authorId: gameMessages.authorId,
        authorName: users.username,
        authorAvatarUrl: users.avatarUrl,
        content: gameMessages.content,
        createdAt: gameMessages.createdAt,
      }).from(gameMessages).innerJoin(users, eq(gameMessages.authorId, users.id))
        .where(and(eq(gameMessages.gameId, gameId), ...(cursorCondition ? [cursorCondition] : [])))
        .orderBy(desc(gameMessages.createdAt), desc(gameMessages.id)).limit(limit + 1)
      const items = rows.slice(0, limit).map(toMessage)
      return { items, nextCursor: rows.length > limit && items.at(-1) ? encodeCursor(items.at(-1) as MessageRecord) : null }
    },

    async findById({ gameId, messageId }) {
      return readMessage(database, gameId, messageId)
    },

    async create({ gameIdOrSlug, authorId, content, now }) {
      return database.transaction(async (tx) => {
        const game = await findGame(tx, gameIdOrSlug)
        if (!game) throw new Error('MESSAGE_NOT_FOUND')
        const [lockedGame] = await tx.select({ id: games.id, ownerId: games.ownerId, status: games.status }).from(games).where(eq(games.id, game.id)).for('update').limit(1)
        if (!lockedGame) throw new Error('MESSAGE_NOT_FOUND')
        const access = await readAccess(tx, lockedGame.id, authorId)
        if (!access?.canWrite) throw new Error('MESSAGE_FORBIDDEN')
        const [created] = await tx.insert(gameMessages).values({ gameId: lockedGame.id, authorId, content, createdAt: now }).returning({ id: gameMessages.id })
        if (!created) throw new Error('MESSAGE_CREATE_FAILED')
        const message = await readMessage(tx, lockedGame.id, created.id)
        if (!message) throw new Error('MESSAGE_CREATE_FAILED')
        return message
      })
    },
  }
}

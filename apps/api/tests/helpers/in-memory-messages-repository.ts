import type { GameStatus } from '@jdr-hub/shared'
import { canReadGameMessages, canWriteGameMessages } from '../../src/modules/messages/policy.js'
import type { GameMessageRepository, MessageAccess, MessageRecord } from '../../src/modules/messages/repository.js'

type SeedGame = {
  id: string
  slug: string
  status: GameStatus
  ownerId: string
  members: Record<string, string>
}

type InMemoryMessagesRepository = GameMessageRepository & {
  messages: MessageRecord[]
}

const encodeCursor = (message: Pick<MessageRecord, 'id' | 'createdAt'>): string => Buffer.from(JSON.stringify({ id: message.id, createdAt: message.createdAt.toISOString() }), 'utf8').toString('base64url')

const decodeCursor = (cursor: string | null): { id: string; createdAt: Date } | null => {
  if (!cursor) return null
  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as { id?: unknown; createdAt?: unknown }
    if (typeof parsed.id !== 'string' || typeof parsed.createdAt !== 'string') return null
    const createdAt = new Date(parsed.createdAt)
    return Number.isNaN(createdAt.getTime()) ? null : { id: parsed.id, createdAt }
  } catch {
    return null
  }
}

export function createInMemoryMessagesRepository(input: { games: SeedGame[]; messages?: MessageRecord[] }): InMemoryMessagesRepository {
  const games = input.games.map((game) => ({ ...game, members: { ...game.members } }))
  const messages = (input.messages ?? []).map((message) => ({ ...message }))
  let sequence = messages.length + 1
  const findGame = (gameIdOrSlug: string) => games.find((game) => game.id === gameIdOrSlug || game.slug === gameIdOrSlug)
  const getAccess = async ({ gameIdOrSlug, userId }: { gameIdOrSlug: string; userId: string }): Promise<MessageAccess | null> => {
    const game = findGame(gameIdOrSlug)
    if (!game) return null
    const policyInput = { gameStatus: game.status, isOwner: game.ownerId === userId, memberStatus: game.members[userId] ?? 'NONE' }
    return { gameId: game.id, gameStatus: game.status, isOwner: policyInput.isOwner, memberStatus: policyInput.memberStatus, canRead: canReadGameMessages(policyInput), canWrite: canWriteGameMessages(policyInput) }
  }

  return {
    messages,
    getAccess,
    async list({ gameId, cursor, limit }) {
      const decoded = decodeCursor(cursor)
      if (cursor && !decoded) throw new Error('MESSAGE_INVALID_CURSOR')
      const sorted = messages.filter((message) => message.gameId === gameId).sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime() || right.id.localeCompare(left.id))
      const filtered = decoded ? sorted.filter((message) => message.createdAt < decoded.createdAt || (message.createdAt.getTime() === decoded.createdAt.getTime() && message.id < decoded.id)) : sorted
      const page = filtered.slice(0, limit)
      return { items: page, nextCursor: filtered.length > limit && page.at(-1) ? encodeCursor(page.at(-1) as MessageRecord) : null }
    },
    async findById({ gameId, messageId }) {
      return messages.find((message) => message.gameId === gameId && message.id === messageId) ?? null
    },
    async create({ gameIdOrSlug, authorId, content, now }) {
      const game = findGame(gameIdOrSlug)
      const access = await getAccess({ gameIdOrSlug, userId: authorId })
      if (!game) throw new Error('MESSAGE_NOT_FOUND')
      if (!access?.canWrite) throw new Error('MESSAGE_FORBIDDEN')
      const message: MessageRecord = { id: `message-${sequence++}`, gameId: game.id, authorId, authorName: authorId, authorAvatarUrl: null, content, createdAt: now }
      messages.push(message)
      return message
    },
  }
}

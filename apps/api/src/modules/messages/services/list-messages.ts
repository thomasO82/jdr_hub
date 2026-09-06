import type { GameMessagesPage } from '@jdr-hub/shared'
import type { GameMessageRepository } from '../repository.js'

export async function listMessages(input: { gameIdOrSlug: string; userId: string; cursor: string | null; limit: number; repository: GameMessageRepository }): Promise<GameMessagesPage> {
  const access = await input.repository.getAccess({ gameIdOrSlug: input.gameIdOrSlug, userId: input.userId })
  if (!access?.canRead) throw new Error('MESSAGE_FORBIDDEN')
  const page = await input.repository.list({ gameId: access.gameId, userId: input.userId, cursor: input.cursor, limit: input.limit })
  return {
    items: page.items.map((message) => ({
      id: message.id,
      author: { name: message.authorName, avatarUrl: message.authorAvatarUrl },
      content: message.content,
      createdAt: message.createdAt.toISOString(),
    })),
    nextCursor: page.nextCursor,
    canWrite: access.canWrite,
  }
}

import { gameMessageCommandSchema } from '@jdr-hub/shared'
import type { GameMessageRepository, MessageRecord } from '../repository.js'

export async function createMessage(input: { gameIdOrSlug: string; userId: string; content: string; repository: GameMessageRepository; now?: Date }): Promise<MessageRecord> {
  const parsed = gameMessageCommandSchema.safeParse({ content: input.content })
  if (!parsed.success) throw new Error('MESSAGE_INVALID')
  const access = await input.repository.getAccess({ gameIdOrSlug: input.gameIdOrSlug, userId: input.userId })
  if (!access?.canWrite) throw new Error('MESSAGE_FORBIDDEN')
  return input.repository.create({ gameIdOrSlug: input.gameIdOrSlug, authorId: input.userId, content: parsed.data.content, now: input.now ?? new Date() })
}

import { z } from 'zod'

export const gameMessageCommandSchema = z
  .object({
    content: z.string().trim().min(1).max(2_000),
  })
  .strict()

export const gameMessageQuerySchema = z
  .object({
    cursor: z.string().trim().min(1).max(128).optional(),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  })
  .strict()

export type GameMessageCommand = z.infer<typeof gameMessageCommandSchema>
export type GameMessageQuery = z.infer<typeof gameMessageQuerySchema>

export type GameMessageView = {
  id: string
  author: {
    name: string
    avatarUrl: string | null
  }
  content: string
  createdAt: string
}

export type GameMessagesPage = {
  items: GameMessageView[]
  nextCursor: string | null
  canWrite: boolean
}

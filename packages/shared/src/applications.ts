import { z } from 'zod'

export const applicationStatusSchema = z.enum(['PENDING', 'ACCEPTED', 'REJECTED'])
export const applicationDecisionSchema = z.object({
  status: z.enum(['ACCEPTED', 'REJECTED']),
}).strict()
export const applicationCommandSchema = z.object({
  message: z.string().trim().max(1_000).optional(),
}).strict()

export type ApplicationStatus = z.infer<typeof applicationStatusSchema>
export type ApplicationDecision = z.infer<typeof applicationDecisionSchema>
export type ApplicationCommand = z.infer<typeof applicationCommandSchema>

export type Application = {
  id: string
  gameId: string
  gameTitle: string
  userId: string
  username: string
  message: string | null
  status: ApplicationStatus
  createdAt: Date
  updatedAt: Date
}

export type GameMember = {
  gameId: string
  userId: string
  role: 'PLAYER' | 'GM'
  status: 'ACTIVE' | 'REMOVED'
  joinedAt: Date
}

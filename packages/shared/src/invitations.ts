import { z } from 'zod'

export const invitationStatusSchema = z.enum([
  'PENDING',
  'ACCEPTED',
  'REJECTED',
  'CANCELLED',
  'EXPIRED',
])

export const invitationCommandSchema = z.object({
  inviteeId: z.uuid(),
}).strict()

export const invitationDecisionSchema = z.object({
  status: z.enum(['ACCEPTED', 'REJECTED', 'CANCELLED']),
}).strict()

export type InvitationStatus = z.infer<typeof invitationStatusSchema>
export type InvitationCommand = z.infer<typeof invitationCommandSchema>
export type InvitationDecision = z.infer<typeof invitationDecisionSchema>

export type Invitation = {
  id: string
  gameId: string
  gameTitle: string
  inviterId: string
  inviterName: string
  inviteeId: string
  inviteeName: string
  status: InvitationStatus
  expiresAt: string
  createdAt: string
  updatedAt: string
}

export type InvitationsPage = {
  items: Invitation[]
}

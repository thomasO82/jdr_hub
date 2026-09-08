import type { InvitationDecision } from '@jdr-hub/shared'
import type { InvitationRepository } from '../repository.js'
import { toInvitationView } from './view.js'

export async function decideInvitation(input: { invitationId: string; userId: string; status: InvitationDecision['status']; repository: InvitationRepository; now?: () => Date }) {
  const now = (input.now ?? (() => new Date()))()
  const invitation = await input.repository.findById(input.invitationId)
  if (!invitation) throw new Error('INVITATION_NOT_FOUND')
  const game = await input.repository.findGame(invitation.gameId)
  if (input.status === 'CANCELLED' && (!game || game.ownerId !== input.userId)) throw new Error('INVITATION_FORBIDDEN')
  if (input.status !== 'CANCELLED' && invitation.inviteeId !== input.userId) throw new Error('INVITATION_FORBIDDEN')
  if (invitation.status === input.status) return toInvitationView(invitation, now)
  const updated = await input.repository.updateStatus({ invitationId: input.invitationId, actorId: input.userId, status: input.status, now })
  if (!updated) throw new Error('INVITATION_NOT_FOUND')
  return toInvitationView(updated, now)
}

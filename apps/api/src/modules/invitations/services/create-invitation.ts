import type { Invitation } from '@jdr-hub/shared'
import { INVITATION_TTL_MS, canCreateInvitation, isInvitationExpired } from '../policy.js'
import type { InvitationRepository } from '../repository.js'
import { toInvitationView } from './view.js'

export async function createInvitation(input: { gameId: string; ownerId: string; inviteeId: string; repository: InvitationRepository; now?: () => Date }): Promise<Invitation> {
  const now = (input.now ?? (() => new Date()))()
  const game = await input.repository.findGame(input.gameId)
  if (!game || game.ownerId !== input.ownerId) throw new Error('INVITATION_FORBIDDEN')
  const existing = await input.repository.findPending(game.id, input.inviteeId)
  if (!canCreateInvitation({ gameStatus: game.status, isActiveMember: await input.repository.isActiveMember(game.id, input.inviteeId), hasPendingInvitation: Boolean(existing && !isInvitationExpired(existing, now)) })) throw new Error('INVITATION_CONFLICT')
  const invitation = await input.repository.create({ gameId: game.id, inviterId: input.ownerId, inviteeId: input.inviteeId, expiresAt: new Date(now.getTime() + INVITATION_TTL_MS), now })
  return toInvitationView(invitation, now)
}

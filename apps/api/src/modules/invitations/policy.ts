import type { GameStatus, InvitationDecision, InvitationStatus } from '@jdr-hub/shared'

export const INVITATION_TTL_MS = 7 * 24 * 60 * 60_000

const invitationGameStatuses = new Set<GameStatus>(['OPEN', 'ACTIVE'])

export function canCreateInvitation(input: {
  gameStatus: GameStatus
  isActiveMember: boolean
  hasPendingInvitation: boolean
}): boolean {
  return invitationGameStatuses.has(input.gameStatus)
    && !input.isActiveMember
    && !input.hasPendingInvitation
}

export function isInvitationExpired(input: { status: InvitationStatus; expiresAt: Date }, now: Date): boolean {
  return input.status === 'PENDING' && input.expiresAt.getTime() <= now.getTime()
}

export function canUpdateInvitation(input: {
  status: InvitationStatus
  expiresAt: Date
  actorRole: 'OWNER' | 'INVITEE'
  requestedStatus: InvitationDecision['status']
  now: Date
}): boolean {
  if (input.status !== 'PENDING' || isInvitationExpired(input, input.now)) return false
  if (input.actorRole === 'OWNER') return input.requestedStatus === 'CANCELLED'
  return input.requestedStatus === 'ACCEPTED' || input.requestedStatus === 'REJECTED'
}

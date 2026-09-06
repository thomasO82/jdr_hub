import type { Invitation } from '@jdr-hub/shared'
import { isInvitationExpired } from '../policy.js'
import type { InvitationRecord } from '../repository.js'

export function toInvitationView(record: InvitationRecord, now: Date): Invitation {
  return {
    id: record.id,
    gameId: record.gameId,
    gameTitle: record.gameTitle,
    inviterId: record.inviterId,
    inviterName: record.inviterName,
    inviteeId: record.inviteeId,
    inviteeName: record.inviteeName,
    status: isInvitationExpired(record, now) ? 'EXPIRED' : record.status,
    expiresAt: record.expiresAt.toISOString(),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  }
}

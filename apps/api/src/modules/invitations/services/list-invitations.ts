import type { Invitation } from '@jdr-hub/shared'
import type { InvitationRepository } from '../repository.js'
import { toInvitationView } from './view.js'

export async function listInvitations(input: { scope: 'INVITEE' | 'OWNER'; userId: string; gameId?: string; repository: InvitationRepository; now?: () => Date }): Promise<Invitation[]> {
  const now = (input.now ?? (() => new Date()))()
  const records = input.scope === 'INVITEE'
    ? await input.repository.listForInvitee(input.userId)
    : input.gameId ? await input.repository.listForOwner(input.gameId, input.userId) : null
  if (records === null) throw new Error('INVITATION_FORBIDDEN')
  return records.map((record) => toInvitationView(record, now))
}

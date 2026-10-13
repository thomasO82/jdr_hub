import { describe, expect, it } from 'vitest'
import {
  INVITATION_TTL_MS,
  canCreateInvitation,
  canUpdateInvitation,
  isInvitationExpired,
} from '../../../src/modules/invitations/policy.js'

const now = new Date('2026-09-06T12:00:00.000Z')

describe('invitation policy', () => {
  it('allows invitations only for open games and non-members', () => {
    expect(canCreateInvitation({ gameStatus: 'OPEN', isActiveMember: false, hasPendingInvitation: false })).toBe(true)
    expect(canCreateInvitation({ gameStatus: 'ACTIVE', isActiveMember: false, hasPendingInvitation: false })).toBe(true)
    expect(canCreateInvitation({ gameStatus: 'CLOSED', isActiveMember: false, hasPendingInvitation: false })).toBe(false)
    expect(canCreateInvitation({ gameStatus: 'OPEN', isActiveMember: true, hasPendingInvitation: false })).toBe(false)
    expect(canCreateInvitation({ gameStatus: 'OPEN', isActiveMember: false, hasPendingInvitation: true })).toBe(false)
  })

  it('uses a seven-day server-side expiration and rejects expired decisions', () => {
    const expiresAt = new Date(now.getTime() + INVITATION_TTL_MS)
    expect(expiresAt.toISOString()).toBe('2026-09-13T12:00:00.000Z')
    expect(isInvitationExpired({ status: 'PENDING', expiresAt }, now)).toBe(false)
    expect(isInvitationExpired({ status: 'PENDING', expiresAt }, new Date(expiresAt.getTime() + 1))).toBe(true)
    expect(canUpdateInvitation({ status: 'PENDING', expiresAt, actorRole: 'INVITEE', requestedStatus: 'ACCEPTED', now })).toBe(true)
    expect(canUpdateInvitation({ status: 'PENDING', expiresAt: new Date(now.getTime() - 1), actorRole: 'INVITEE', requestedStatus: 'ACCEPTED', now })).toBe(false)
  })

  it('allows only the correct terminal transition for each actor', () => {
    expect(canUpdateInvitation({ status: 'PENDING', expiresAt: new Date(now.getTime() + 1), actorRole: 'INVITEE', requestedStatus: 'REJECTED', now })).toBe(true)
    expect(canUpdateInvitation({ status: 'PENDING', expiresAt: new Date(now.getTime() + 1), actorRole: 'OWNER', requestedStatus: 'CANCELLED', now })).toBe(true)
    expect(canUpdateInvitation({ status: 'PENDING', expiresAt: new Date(now.getTime() + 1), actorRole: 'OWNER', requestedStatus: 'ACCEPTED', now })).toBe(false)
    expect(canUpdateInvitation({ status: 'ACCEPTED', expiresAt: new Date(now.getTime() + 1), actorRole: 'INVITEE', requestedStatus: 'REJECTED', now })).toBe(false)
  })
})

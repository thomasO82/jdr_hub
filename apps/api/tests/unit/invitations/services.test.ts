import { describe, expect, it } from 'vitest'
import { createInvitation } from '../../../src/modules/invitations/services/create-invitation.js'
import { decideInvitation } from '../../../src/modules/invitations/services/decide-invitation.js'
import { listInvitations } from '../../../src/modules/invitations/services/list-invitations.js'
import { createInMemoryInvitationsRepository } from '../../helpers/in-memory-invitations-repository.js'

const ownerId = '00000000-0000-4000-8000-000000000001'
const inviteeId = '00000000-0000-4000-8000-000000000002'
const secondInviteeId = '00000000-0000-4000-8000-000000000003'
const gameId = '00000000-0000-4000-8000-000000000010'
const now = new Date('2026-09-06T12:00:00.000Z')

function repository(options: { status?: 'OPEN' | 'ACTIVE' | 'CLOSED'; maxPlayers?: number; activeMembers?: Array<{ gameId: string; userId: string }> } = {}) {
  return createInMemoryInvitationsRepository({
    games: [{ id: gameId, ownerId, title: 'La crypte', status: options.status ?? 'OPEN', maxPlayers: options.maxPlayers ?? 4 }],
    activeMembers: options.activeMembers ?? [{ gameId, userId: ownerId }],
  })
}

describe('invitation services', () => {
  it('creates an invitation with a server-controlled seven-day expiration', async () => {
    const repo = repository()
    const invitation = await createInvitation({ gameId, ownerId, inviteeId, repository: repo, now: () => now })
    expect(invitation).toMatchObject({ gameId, inviterId: ownerId, inviteeId, status: 'PENDING' })
    expect(invitation.expiresAt).toBe('2026-09-13T12:00:00.000Z')
  })

  it('rejects closed games, active members and pending duplicates', async () => {
    await expect(createInvitation({ gameId, ownerId, inviteeId, repository: repository({ status: 'CLOSED' }), now: () => now })).rejects.toThrow('INVITATION_CONFLICT')
    await expect(createInvitation({ gameId, ownerId, inviteeId, repository: repository({ activeMembers: [{ gameId, userId: ownerId }, { gameId, userId: inviteeId }] }), now: () => now })).rejects.toThrow('INVITATION_CONFLICT')
    const repo = repository()
    await createInvitation({ gameId, ownerId, inviteeId, repository: repo, now: () => now })
    await expect(createInvitation({ gameId, ownerId, inviteeId, repository: repo, now: () => now })).rejects.toThrow('INVITATION_CONFLICT')
  })

  it('accepts once, adds the invitee to the roster and makes identical decisions idempotent', async () => {
    const repo = repository()
    const invitation = await createInvitation({ gameId, ownerId, inviteeId, repository: repo, now: () => now })
    const accepted = await decideInvitation({ invitationId: invitation.id, userId: inviteeId, status: 'ACCEPTED', repository: repo, now: () => now })
    const replay = await decideInvitation({ invitationId: invitation.id, userId: inviteeId, status: 'ACCEPTED', repository: repo, now: () => now })
    expect(accepted.status).toBe('ACCEPTED')
    expect(replay).toEqual(accepted)
    expect(await repo.countActiveMembers(gameId)).toBe(2)
  })

  it('rejects acceptance when capacity is reached and lets the owner cancel', async () => {
    const repo = repository({ maxPlayers: 1, activeMembers: [{ gameId, userId: ownerId }] })
    const invitation = await createInvitation({ gameId, ownerId, inviteeId, repository: repo, now: () => now })
    await expect(decideInvitation({ invitationId: invitation.id, userId: inviteeId, status: 'ACCEPTED', repository: repo, now: () => now })).rejects.toThrow('INVITATION_CONFLICT')
    const cancelled = await decideInvitation({ invitationId: invitation.id, userId: ownerId, status: 'CANCELLED', repository: repo, now: () => now })
    expect(cancelled.status).toBe('CANCELLED')
  })

  it('maps expired invitations to EXPIRED without mutating them during listing', async () => {
    const repo = repository()
    const invitation = await createInvitation({ gameId, ownerId, inviteeId, repository: repo, now: () => new Date('2026-08-01T12:00:00.000Z') })
    const listed = await listInvitations({ scope: 'INVITEE', userId: inviteeId, repository: repo, now: () => now })
    expect(listed[0]).toMatchObject({ id: invitation.id, status: 'EXPIRED' })
  })

  it('does not allow an invitee to decide another user invitation', async () => {
    const repo = repository()
    const invitation = await createInvitation({ gameId, ownerId, inviteeId: secondInviteeId, repository: repo, now: () => now })
    await expect(decideInvitation({ invitationId: invitation.id, userId: inviteeId, status: 'REJECTED', repository: repo, now: () => now })).rejects.toThrow('INVITATION_FORBIDDEN')
  })
})

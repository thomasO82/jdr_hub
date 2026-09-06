import { randomUUID } from 'node:crypto'
import type { InvitationStatus } from '@jdr-hub/shared'
import type { InvitationGame, InvitationRecord, InvitationRepository } from '../../src/modules/invitations/repository.js'

type SeedInvitation = Omit<InvitationRecord, 'createdAt' | 'updatedAt'> & { createdAt?: Date; updatedAt?: Date }

type InMemoryInvitationRepository = InvitationRepository & {
  countActiveMembers(gameId: string): Promise<number>
}

export function createInMemoryInvitationsRepository(input: {
  games?: InvitationGame[]
  invitations?: SeedInvitation[]
  activeMembers?: Array<{ gameId: string; userId: string }>
} = {}): InMemoryInvitationRepository {
  const games = new Map((input.games ?? []).map((game) => [game.id, game]))
  const invitations = new Map<string, InvitationRecord>((input.invitations ?? []).map((invitation) => [invitation.id, {
    ...invitation,
    createdAt: invitation.createdAt ?? new Date('2026-09-01T12:00:00.000Z'),
    updatedAt: invitation.updatedAt ?? new Date('2026-09-01T12:00:00.000Z'),
  }]))
  const members = new Set((input.activeMembers ?? []).map((member) => `${member.gameId}:${member.userId}`))
  const ownerFor = (gameId: string) => [...games.values()].find((game) => game.id === gameId)?.ownerId ?? ''
  const gameTitle = (gameId: string) => games.get(gameId)?.title ?? gameId
  const names = (userId: string) => userId
  const view = (record: InvitationRecord): InvitationRecord => ({ ...record, gameTitle: record.gameTitle || gameTitle(record.gameId), inviterName: record.inviterName || names(record.inviterId), inviteeName: record.inviteeName || names(record.inviteeId) })
  const activeCount = (gameId: string) => [...members].filter((value) => value.startsWith(`${gameId}:`)).length

  return {
    async findGame(gameId) { return games.get(gameId) ?? null },
    async isActiveMember(gameId, userId) { return members.has(`${gameId}:${userId}`) || ownerFor(gameId) === userId },
    async findPending(gameId, inviteeId) { return [...invitations.values()].find((invitation) => invitation.gameId === gameId && invitation.inviteeId === inviteeId && invitation.status === 'PENDING') ?? null },
    async create(inputData) {
      if ([...invitations.values()].some((invitation) => invitation.gameId === inputData.gameId && invitation.inviteeId === inputData.inviteeId && invitation.status === 'PENDING')) throw new Error('INVITATION_CONFLICT')
      const invitation: InvitationRecord = {
        id: randomUUID(),
        gameId: inputData.gameId,
        gameTitle: gameTitle(inputData.gameId),
        inviterId: inputData.inviterId,
        inviterName: names(inputData.inviterId),
        inviteeId: inputData.inviteeId,
        inviteeName: names(inputData.inviteeId),
        status: 'PENDING',
        expiresAt: inputData.expiresAt,
        createdAt: inputData.now,
        updatedAt: inputData.now,
      }
      invitations.set(invitation.id, invitation)
      return invitation
    },
    async listForInvitee(userId) { return [...invitations.values()].filter((invitation) => invitation.inviteeId === userId).map(view) },
    async listForOwner(gameId, ownerId) { const game = games.get(gameId); return !game || game.ownerId !== ownerId ? null : [...invitations.values()].filter((invitation) => invitation.gameId === gameId).map(view) },
    async findById(id) { return invitations.get(id) ?? null },
    async updateStatus(inputData) {
      const invitation = invitations.get(inputData.invitationId)
      if (!invitation) return null
      if (inputData.status === 'ACCEPTED') {
        const game = games.get(invitation.gameId)
        if (!game || activeCount(invitation.gameId) >= game.maxPlayers) throw new Error('INVITATION_CONFLICT')
        members.add(`${invitation.gameId}:${invitation.inviteeId}`)
      }
      const updated: InvitationRecord = { ...invitation, status: inputData.status as InvitationStatus, updatedAt: inputData.now }
      invitations.set(updated.id, updated)
      return updated
    },
    async countActiveMembers(gameId) { return activeCount(gameId) },
  }
}

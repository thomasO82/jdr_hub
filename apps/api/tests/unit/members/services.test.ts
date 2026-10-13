import { describe, expect, it } from 'vitest'
import { listMembers } from '../../../src/modules/members/services/list-members.js'
import { removeMember } from '../../../src/modules/members/services/remove-member.js'
import { createInMemoryMembersRepository } from '../../helpers/in-memory-members-repository.js'

const ownerId = '00000000-0000-4000-8000-000000000001'
const playerId = '00000000-0000-4000-8000-000000000002'
const otherPlayerId = '00000000-0000-4000-8000-000000000003'
const gameId = '00000000-0000-4000-8000-000000000010'
const otherGameId = '00000000-0000-4000-8000-000000000011'
const now = new Date('2026-09-06T12:00:00.000Z')

function repository() {
  return createInMemoryMembersRepository({
    games: [{ id: gameId, ownerId }, { id: otherGameId, ownerId }],
    members: [
      { gameId, userId: ownerId, username: 'MJ', avatarUrl: null, role: 'GM', status: 'ACTIVE', joinedAt: now },
      { gameId, userId: playerId, username: 'Joueur', avatarUrl: null, role: 'PLAYER', status: 'ACTIVE', joinedAt: now },
      { gameId: otherGameId, userId: otherPlayerId, username: 'Autre', avatarUrl: null, role: 'PLAYER', status: 'ACTIVE', joinedAt: now },
    ],
  })
}

describe('member services', () => {
  it('lists only the active roster of a game for its owner', async () => {
    const members = await listMembers({ gameId, ownerId, repository: repository() })
    expect(members).toHaveLength(2)
    expect(members.map((member) => member.userId)).toEqual([ownerId, playerId])
  })

  it('rejects another owner and never exposes another game roster', async () => {
    const repo = repository()
    await expect(listMembers({ gameId, ownerId: otherPlayerId, repository: repo })).rejects.toThrow('MEMBER_FORBIDDEN')
    const members = await listMembers({ gameId: otherGameId, ownerId, repository: repo })
    expect(members.map((member) => member.userId)).toEqual([otherPlayerId])
    expect(members.every((member) => member.gameId === otherGameId)).toBe(true)
  })

  it('removes only active players, preserves the GM and is not silently successful twice', async () => {
    const repo = repository()
    await expect(removeMember({ gameId, ownerId, userId: ownerId, repository: repo, now: () => now })).rejects.toThrow('MEMBER_CONFLICT')
    await removeMember({ gameId, ownerId, userId: playerId, repository: repo, now: () => now })
    await expect(removeMember({ gameId, ownerId, userId: playerId, repository: repo, now: () => now })).rejects.toThrow('MEMBER_NOT_FOUND')
    expect((await listMembers({ gameId, ownerId, repository: repo })).map((member) => member.userId)).toEqual([ownerId])
  })
})

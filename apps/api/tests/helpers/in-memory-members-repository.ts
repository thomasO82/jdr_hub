import type { GameMemberView } from '@jdr-hub/shared'
import type { MemberGame, MemberRepository } from '../../src/modules/members/repository.js'

type StoredMember = Omit<GameMemberView, 'joinedAt'> & { joinedAt: Date }

type InMemoryMembersRepository = MemberRepository & {
  members: StoredMember[]
}

export function createInMemoryMembersRepository(input: { games?: MemberGame[]; members?: StoredMember[] } = {}): InMemoryMembersRepository {
  const games = new Map((input.games ?? []).map((game) => [game.id, game]))
  const members = [...(input.members ?? [])].map((member) => ({ ...member }))
  return {
    members,
    async listForOwner(gameId, ownerId) {
      const game = games.get(gameId)
      if (!game || game.ownerId !== ownerId) return null
      return members
        .filter((member) => member.gameId === gameId && member.status === 'ACTIVE')
        .sort((left, right) => left.joinedAt.getTime() - right.joinedAt.getTime())
        .map((member) => ({ ...member, joinedAt: member.joinedAt.toISOString() }))
    },
    async remove({ gameId, ownerId, userId }) {
      const game = games.get(gameId)
      if (!game || game.ownerId !== ownerId) throw new Error('MEMBER_FORBIDDEN')
      const member = members.find((candidate) => candidate.gameId === gameId && candidate.userId === userId)
      if (!member) return false
      if (member.status === 'REMOVED') return false
      if (member.role !== 'PLAYER' || member.status !== 'ACTIVE') throw new Error('MEMBER_CONFLICT')
      member.status = 'REMOVED'
      return true
    },
  }
}

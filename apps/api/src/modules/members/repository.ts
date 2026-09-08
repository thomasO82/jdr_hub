import { and, eq } from 'drizzle-orm'
import { authSchema, gameSchema, type createDatabase } from '@jdr-hub/database'
import type { GameMemberView } from '@jdr-hub/shared'
import { canRemoveMember } from './policy.js'

export type MemberGame = {
  id: string
  ownerId: string
}

export interface MemberRepository {
  listForOwner(gameId: string, ownerId: string): Promise<GameMemberView[] | null>
  remove(input: { gameId: string; ownerId: string; userId: string; now: Date }): Promise<boolean>
}

type Database = ReturnType<typeof createDatabase>['db']

export function createPostgresMemberRepository(database: Database): MemberRepository {
  const { users } = authSchema
  const { games, gameMembers } = gameSchema

  return {
    async listForOwner(gameId, ownerId) {
      const [game] = await database.select({ ownerId: games.ownerId, createdAt: games.createdAt })
        .from(games)
        .where(eq(games.id, gameId))
        .limit(1)
      if (!game || game.ownerId !== ownerId) return null

      const [owner] = await database.select({ id: users.id, username: users.username, avatarUrl: users.avatarUrl })
        .from(users)
        .where(eq(users.id, ownerId))
        .limit(1)
      if (!owner) return null

      const rows = await database.select({
        userId: gameMembers.userId,
        username: users.username,
        avatarUrl: users.avatarUrl,
        role: gameMembers.role,
        status: gameMembers.status,
        joinedAt: gameMembers.joinedAt,
      }).from(gameMembers)
        .innerJoin(users, eq(gameMembers.userId, users.id))
        .where(and(eq(gameMembers.gameId, gameId), eq(gameMembers.status, 'ACTIVE')))
        .orderBy(gameMembers.joinedAt, gameMembers.userId)

      const members: GameMemberView[] = rows
        .filter((row) => row.userId !== owner.id)
        .map((row) => ({
          gameId,
          userId: row.userId,
          username: row.username,
          avatarUrl: row.avatarUrl,
          role: row.role as GameMemberView['role'],
          status: row.status as GameMemberView['status'],
          joinedAt: row.joinedAt.toISOString(),
        }))

      return [{ gameId, userId: owner.id, username: owner.username, avatarUrl: owner.avatarUrl, role: 'GM', status: 'ACTIVE', joinedAt: game.createdAt.toISOString() }, ...members]
    },
    async remove({ gameId, ownerId, userId, now }) {
      return database.transaction(async (tx) => {
        const [game] = await tx.select({ ownerId: games.ownerId })
          .from(games)
          .where(eq(games.id, gameId))
          .for('update')
          .limit(1)
        if (!game || game.ownerId !== ownerId) throw new Error('MEMBER_FORBIDDEN')

        const [member] = await tx.select({ role: gameMembers.role, status: gameMembers.status })
          .from(gameMembers)
          .where(and(eq(gameMembers.gameId, gameId), eq(gameMembers.userId, userId)))
          .for('update')
          .limit(1)
        if (!member) return false
        if (member.status === 'REMOVED') return false
        if (!canRemoveMember({ role: member.role as 'PLAYER' | 'GM', status: member.status as 'ACTIVE' | 'REMOVED' })) throw new Error('MEMBER_CONFLICT')

        await tx.update(gameMembers)
          .set({ status: 'REMOVED' })
          .where(and(eq(gameMembers.gameId, gameId), eq(gameMembers.userId, userId)))
        void now
        return true
      })
    },
  }
}

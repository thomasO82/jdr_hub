import { and, asc, desc, eq, gte, inArray, or } from 'drizzle-orm'
import { gameSchema, schedulingSchema, type createDatabase } from '@jdr-hub/database'
import type { DashboardGameSummary, DashboardSessionSummary, DashboardRole, GameStatus, GameType, SessionStatus } from '@jdr-hub/shared'

export interface DashboardRepository {
  findNextSession(input: { userId: string; now: Date }): Promise<DashboardSessionSummary | null>
  listActiveGames(input: { userId: string }): Promise<DashboardGameSummary[]>
}

type Database = ReturnType<typeof createDatabase>['db']

function roleForGame(ownerId: string, userId: string): DashboardRole {
  return ownerId === userId ? 'GM' : 'PLAYER'
}

export function createPostgresDashboardRepository(database: Database): DashboardRepository {
  const { games, gameMembers } = gameSchema
  const { gameSessions } = schedulingSchema

  return {
    async findNextSession({ userId, now }) {
      const [row] = await database.select({
        id: gameSessions.id,
        gameId: gameSessions.gameId,
        gameTitle: games.title,
        ownerId: games.ownerId,
        startsAt: gameSessions.startsAt,
        endsAt: gameSessions.endsAt,
        status: gameSessions.status,
        memberStatus: gameMembers.status,
      }).from(gameSessions)
        .innerJoin(games, eq(gameSessions.gameId, games.id))
        .leftJoin(gameMembers, eq(gameMembers.gameId, games.id))
        .where(and(
          or(eq(games.ownerId, userId), and(eq(gameMembers.userId, userId), eq(gameMembers.status, 'ACTIVE'))),
          eq(gameSessions.status, 'SCHEDULED'),
          gte(gameSessions.endsAt, now),
        ))
        .orderBy(asc(gameSessions.startsAt), asc(gameSessions.id))
        .limit(1)

      if (!row) return null
      return {
        id: row.id,
        gameId: row.gameId,
        gameTitle: row.gameTitle,
        startsAt: row.startsAt.toISOString(),
        endsAt: row.endsAt.toISOString(),
        status: row.status as SessionStatus,
        role: roleForGame(row.ownerId, userId),
        canReportAbsence: row.ownerId !== userId && row.memberStatus === 'ACTIVE',
      }
    },

    async listActiveGames({ userId }) {
      const rows = await database.select({
        id: games.id,
        title: games.title,
        system: games.system,
        type: games.type,
        status: games.status,
        ownerId: games.ownerId,
        memberStatus: gameMembers.status,
        updatedAt: games.updatedAt,
      }).from(games)
        .leftJoin(gameMembers, eq(gameMembers.gameId, games.id))
        .where(and(
          or(eq(games.ownerId, userId), and(eq(gameMembers.userId, userId), eq(gameMembers.status, 'ACTIVE'))),
          inArray(games.status, ['OPEN', 'ACTIVE']),
        ))
        .orderBy(desc(games.updatedAt), asc(games.id))
        .limit(12)

      return rows.map((row) => ({
        id: row.id,
        title: row.title,
        system: row.system,
        type: row.type as GameType,
        status: row.status as GameStatus,
        role: roleForGame(row.ownerId, userId),
      }))
    },
  }
}

import { and, asc, count, eq, gte, gt, inArray, or } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { authSchema, gameSchema, invitationsSchema, schedulingSchema, type createDatabase } from '@jdr-hub/database'
import type {
  ApplicationStatus,
  AttendanceAction,
  DashboardApplication,
  DashboardApplicationSummary,
  DashboardGame,
  DashboardInvitationSummary,
  DashboardSession,
  DashboardUser,
  GameManagementView,
  GameMemberView,
  GameStatus,
  GameType,
  Invitation,
  InvitationStatus,
  SchedulingAction,
  SessionStatus,
} from '@jdr-hub/shared'

export interface DashboardRepository {
  getUser(userId: string): Promise<DashboardUser | null>
  getNextSession(userId: string, now: Date): Promise<DashboardSession | null>
  listActiveGames(userId: string): Promise<DashboardGame[]>
  listApplicationSummary(userId: string): Promise<DashboardApplicationSummary>
  listInvitationSummary(userId: string, now: Date): Promise<DashboardInvitationSummary>
  listSchedulingActions(userId: string, now: Date): Promise<SchedulingAction[]>
  listAttendanceActions(userId: string, now: Date): Promise<AttendanceAction[]>
  getGameManagement(gameId: string, ownerId: string, now: Date): Promise<GameManagementView | null>
}

type Database = ReturnType<typeof createDatabase>['db']

const toDashboardSession = (row: { id: string; gameId: string; gameTitle: string; startsAt: Date; endsAt: Date; status: string; notes: string | null }): DashboardSession => ({
  id: row.id,
  gameId: row.gameId,
  gameTitle: row.gameTitle,
  startsAt: row.startsAt.toISOString(),
  endsAt: row.endsAt.toISOString(),
  status: row.status as SessionStatus,
  notes: row.notes,
})

const toInvitation = (row: { id: string; gameId: string; gameTitle: string; inviterId: string; inviterName: string; inviteeId: string; inviteeName: string; status: string; expiresAt: Date; createdAt: Date; updatedAt: Date }, now: Date): Invitation => ({
  id: row.id,
  gameId: row.gameId,
  gameTitle: row.gameTitle,
  inviterId: row.inviterId,
  inviterName: row.inviterName,
  inviteeId: row.inviteeId,
  inviteeName: row.inviteeName,
  status: row.status === 'PENDING' && row.expiresAt.getTime() <= now.getTime() ? 'EXPIRED' : row.status as InvitationStatus,
  expiresAt: row.expiresAt.toISOString(),
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
})

const invitationUser = (users: typeof authSchema.users, name: string) => alias(users, name)

export function createPostgresDashboardRepository(database: Database): DashboardRepository {
  const { users } = authSchema
  const { games, gameMembers, applications } = gameSchema
  const { invitations } = invitationsSchema
  const { timeProposals, gameSessions } = schedulingSchema
  const inviter = invitationUser(users, 'dashboard_inviter')
  const invitee = invitationUser(users, 'dashboard_invitee')

  const accessibleGameCondition = (userId: string) => or(
    eq(games.ownerId, userId),
    and(eq(gameMembers.userId, userId), eq(gameMembers.status, 'ACTIVE')),
  )

  const readNextSessionForGame = async (gameId: string, now: Date): Promise<DashboardSession | null> => {
    const [row] = await database.select({ id: gameSessions.id, gameId: gameSessions.gameId, gameTitle: games.title, startsAt: gameSessions.startsAt, endsAt: gameSessions.endsAt, status: gameSessions.status, notes: gameSessions.notes })
      .from(gameSessions)
      .innerJoin(games, eq(gameSessions.gameId, games.id))
      .where(and(eq(gameSessions.gameId, gameId), eq(gameSessions.status, 'SCHEDULED'), gte(gameSessions.startsAt, now)))
      .orderBy(asc(gameSessions.startsAt), asc(gameSessions.id))
      .limit(1)
    return row ? toDashboardSession(row) : null
  }

  const readMembers = async (gameId: string, ownerId: string, createdAt: Date): Promise<GameMemberView[]> => {
    const [owner] = await database.select({ id: users.id, username: users.username, avatarUrl: users.avatarUrl })
      .from(users)
      .where(eq(users.id, ownerId))
      .limit(1)
    if (!owner) return []
    const rows = await database.select({ userId: gameMembers.userId, username: users.username, avatarUrl: users.avatarUrl, role: gameMembers.role, status: gameMembers.status, joinedAt: gameMembers.joinedAt })
      .from(gameMembers)
      .innerJoin(users, eq(gameMembers.userId, users.id))
      .where(and(eq(gameMembers.gameId, gameId), eq(gameMembers.status, 'ACTIVE')))
      .orderBy(asc(gameMembers.joinedAt), asc(gameMembers.userId))
    return [{ gameId, userId: owner.id, username: owner.username, avatarUrl: owner.avatarUrl, role: 'GM', status: 'ACTIVE', joinedAt: createdAt.toISOString() }, ...rows
      .filter((row) => row.userId !== owner.id)
      .map((row) => ({ gameId, userId: row.userId, username: row.username, avatarUrl: row.avatarUrl, role: row.role as GameMemberView['role'], status: row.status as GameMemberView['status'], joinedAt: row.joinedAt.toISOString() }))]
  }

  const readInvitationRows = async (gameId: string) => database.select({
    id: invitations.id,
    gameId: invitations.gameId,
    gameTitle: games.title,
    inviterId: invitations.inviterId,
    inviterName: inviter.username,
    inviteeId: invitations.inviteeId,
    inviteeName: invitee.username,
    status: invitations.status,
    expiresAt: invitations.expiresAt,
    createdAt: invitations.createdAt,
    updatedAt: invitations.updatedAt,
  }).from(invitations)
    .innerJoin(games, eq(invitations.gameId, games.id))
    .innerJoin(inviter, eq(invitations.inviterId, inviter.id))
    .innerJoin(invitee, eq(invitations.inviteeId, invitee.id))
    .where(eq(invitations.gameId, gameId))
    .orderBy(asc(invitations.createdAt), asc(invitations.id))

  return {
    async getUser(userId) {
      const [user] = await database.select({ id: users.id, username: users.username, avatarUrl: users.avatarUrl }).from(users).where(eq(users.id, userId)).limit(1)
      return user ?? null
    },
    async getNextSession(userId, now) {
      const [row] = await database.select({ id: gameSessions.id, gameId: gameSessions.gameId, gameTitle: games.title, startsAt: gameSessions.startsAt, endsAt: gameSessions.endsAt, status: gameSessions.status, notes: gameSessions.notes })
        .from(gameSessions)
        .innerJoin(games, eq(gameSessions.gameId, games.id))
        .leftJoin(gameMembers, and(eq(gameMembers.gameId, games.id), eq(gameMembers.userId, userId)))
        .where(and(eq(gameSessions.status, 'SCHEDULED'), gte(gameSessions.startsAt, now), accessibleGameCondition(userId)))
        .orderBy(asc(gameSessions.startsAt), asc(gameSessions.id))
        .limit(1)
      return row ? toDashboardSession(row) : null
    },
    async listActiveGames(userId) {
      const [owned, member] = await Promise.all([
        database.select({ id: games.id, slug: games.slug, title: games.title, system: games.system, type: games.type, status: games.status, maxPlayers: games.maxPlayers }).from(games).where(and(eq(games.ownerId, userId), inArray(games.status, ['OPEN', 'ACTIVE']))),
        database.select({ id: games.id, slug: games.slug, title: games.title, system: games.system, type: games.type, status: games.status, maxPlayers: games.maxPlayers }).from(games).innerJoin(gameMembers, eq(gameMembers.gameId, games.id)).where(and(eq(gameMembers.userId, userId), eq(gameMembers.status, 'ACTIVE'), inArray(games.status, ['OPEN', 'ACTIVE']))),
      ])
      const uniqueGames = new Map<string, { id: string; slug: string; title: string; system: string; type: string; status: string; maxPlayers: number; role: 'GM' | 'PLAYER' }>()
      for (const game of owned) uniqueGames.set(game.id, { ...game, role: 'GM' })
      for (const game of member) if (!uniqueGames.has(game.id)) uniqueGames.set(game.id, { ...game, role: 'PLAYER' })
      const ids = [...uniqueGames.keys()]
      if (ids.length === 0) return []
      const counts = await database.select({ gameId: gameMembers.gameId, total: count() }).from(gameMembers).where(and(inArray(gameMembers.gameId, ids), eq(gameMembers.role, 'PLAYER'), eq(gameMembers.status, 'ACTIVE'))).groupBy(gameMembers.gameId)
      const byGame = new Map(counts.map((row) => [row.gameId, Number(row.total)]))
      return [...uniqueGames.values()].map((game): DashboardGame => ({ ...game, system: game.system, type: game.type as GameType, status: game.status as GameStatus, activePlayers: byGame.get(game.id) ?? 0 }))
    },
    async listApplicationSummary(userId) {
      const rows = await database.select({ status: applications.status, total: count() }).from(applications).where(eq(applications.userId, userId)).groupBy(applications.status)
      const summary: DashboardApplicationSummary = { pending: 0, accepted: 0, rejected: 0 }
      for (const row of rows) {
        if (row.status === 'PENDING') summary.pending = Number(row.total)
        if (row.status === 'ACCEPTED') summary.accepted = Number(row.total)
        if (row.status === 'REJECTED') summary.rejected = Number(row.total)
      }
      return summary
    },
    async listInvitationSummary(userId, now) {
      const [received, sent] = await Promise.all([
        database.select({ total: count() }).from(invitations).where(and(eq(invitations.inviteeId, userId), eq(invitations.status, 'PENDING'), gt(invitations.expiresAt, now))),
        database.select({ total: count() }).from(invitations).where(and(eq(invitations.inviterId, userId), eq(invitations.status, 'PENDING'), gt(invitations.expiresAt, now))),
      ])
      return { receivedPending: Number(received[0]?.total ?? 0), sentPending: Number(sent[0]?.total ?? 0) }
    },
    async listSchedulingActions(userId, now) {
      const proposals = await database.select({ id: timeProposals.id, gameId: games.id, gameTitle: games.title, startsAt: timeProposals.startsAt }).from(timeProposals)
        .innerJoin(games, eq(timeProposals.gameId, games.id))
        .leftJoin(gameMembers, and(eq(gameMembers.gameId, games.id), eq(gameMembers.userId, userId)))
        .where(and(eq(timeProposals.status, 'OPEN'), gte(timeProposals.startsAt, now), accessibleGameCondition(userId)))
        .orderBy(asc(timeProposals.startsAt), asc(timeProposals.id))
      const sessions = await database.select({ id: gameSessions.id, gameId: games.id, gameTitle: games.title, startsAt: gameSessions.startsAt }).from(gameSessions)
        .innerJoin(games, eq(gameSessions.gameId, games.id))
        .leftJoin(gameMembers, and(eq(gameMembers.gameId, games.id), eq(gameMembers.userId, userId)))
        .where(and(eq(gameSessions.status, 'PROPOSED'), gte(gameSessions.startsAt, now), accessibleGameCondition(userId)))
        .orderBy(asc(gameSessions.startsAt), asc(gameSessions.id))
      return [
        ...proposals.map((row): SchedulingAction => ({ kind: 'VOTE', gameId: row.gameId, gameTitle: row.gameTitle, proposalId: row.id, sessionId: null, startsAt: row.startsAt.toISOString() })),
        ...sessions.map((row): SchedulingAction => ({ kind: 'SESSION', gameId: row.gameId, gameTitle: row.gameTitle, proposalId: null, sessionId: row.id, startsAt: row.startsAt.toISOString() })),
      ]
    },
    async listAttendanceActions(userId, now) {
      const rows = await database.select({ sessionId: gameSessions.id, gameId: games.id, gameTitle: games.title, startsAt: gameSessions.startsAt }).from(gameSessions)
        .innerJoin(games, eq(gameSessions.gameId, games.id))
        .leftJoin(gameMembers, and(eq(gameMembers.gameId, games.id), eq(gameMembers.userId, userId)))
        .where(and(eq(gameSessions.status, 'SCHEDULED'), gte(gameSessions.startsAt, now), accessibleGameCondition(userId)))
        .orderBy(asc(gameSessions.startsAt), asc(gameSessions.id))
      return rows.map((row) => ({ sessionId: row.sessionId, gameId: row.gameId, gameTitle: row.gameTitle, startsAt: row.startsAt.toISOString() }))
    },
    async getGameManagement(gameId, ownerId, now) {
      const [game] = await database.select({ id: games.id, slug: games.slug, title: games.title, system: games.system, type: games.type, status: games.status, maxPlayers: games.maxPlayers, createdAt: games.createdAt }).from(games).where(and(eq(games.id, gameId), eq(games.ownerId, ownerId))).limit(1)
      if (!game) return null
      const [activePlayerCount, applicationsRows, invitationRows, nextSession, openProposals] = await Promise.all([
        database.select({ total: count() }).from(gameMembers).where(and(eq(gameMembers.gameId, gameId), eq(gameMembers.role, 'PLAYER'), eq(gameMembers.status, 'ACTIVE'))),
        database.select({ id: applications.id, gameId: applications.gameId, gameTitle: games.title, userId: applications.userId, username: users.username, message: applications.message, status: applications.status, createdAt: applications.createdAt, updatedAt: applications.updatedAt }).from(applications).innerJoin(games, eq(applications.gameId, games.id)).innerJoin(users, eq(applications.userId, users.id)).where(eq(applications.gameId, gameId)).orderBy(asc(applications.createdAt), asc(applications.id)),
        readInvitationRows(gameId),
        readNextSessionForGame(gameId, now),
        database.select({ total: count() }).from(timeProposals).where(and(eq(timeProposals.gameId, gameId), eq(timeProposals.status, 'OPEN'))),
      ])
      const members = await readMembers(gameId, ownerId, game.createdAt)
      const dashboardGame: DashboardGame = { id: game.id, slug: game.slug, title: game.title, system: game.system, type: game.type as GameType, status: game.status as GameStatus, maxPlayers: game.maxPlayers, activePlayers: Number(activePlayerCount[0]?.total ?? 0), role: 'GM' }
      const managementApplications: DashboardApplication[] = applicationsRows.map((row) => ({ id: row.id, gameId: row.gameId, gameTitle: row.gameTitle, userId: row.userId, username: row.username, message: row.message, status: row.status as ApplicationStatus, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() }))
      return { game: dashboardGame, members, applications: managementApplications, invitations: invitationRows.map((row) => toInvitation(row, now)), nextSession, openProposalCount: Number(openProposals[0]?.total ?? 0) }
    },
  }
}

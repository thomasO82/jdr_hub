import { and, count, desc, eq, sql } from 'drizzle-orm'
import { authSchema, gameSchema, type createDatabase } from '@jdr-hub/database'
import type { Application, ApplicationStatus } from '@jdr-hub/shared'

export type ApplicationGame = {
  id: string
  ownerId: string
  visibility: string
  status: string
  maxPlayers: number
}

export interface ApplicationRepository {
  findEligibleGame(gameId: string): Promise<ApplicationGame | null>
  findByGameAndUser(gameId: string, userId: string): Promise<Application | null>
  create(input: { gameId: string; userId: string; message: string | null }): Promise<Application>
  findForUser(userId: string): Promise<Application[]>
  findForGameOwner(gameId: string, ownerId: string): Promise<Application[] | null>
  decide(applicationId: string, ownerId: string, status: Exclude<ApplicationStatus, 'PENDING'>): Promise<Application | null>
}

type Database = ReturnType<typeof createDatabase>['db']

export function createPostgresApplicationRepository(database: Database): ApplicationRepository {
  const { users } = authSchema
  const { games, applications, gameMembers } = gameSchema

  const readApplication = async (db: Pick<Database, 'select'>, id: string): Promise<Application | null> => {
    const [row] = await db.select({
      id: applications.id,
      gameId: applications.gameId,
      gameTitle: games.title,
      userId: applications.userId,
      username: users.username,
      message: applications.message,
      status: applications.status,
      createdAt: applications.createdAt,
      updatedAt: applications.updatedAt,
    }).from(applications).innerJoin(games, eq(applications.gameId, games.id)).innerJoin(users, eq(applications.userId, users.id)).where(eq(applications.id, id)).limit(1)
    return row ? { ...row, status: row.status as ApplicationStatus } : null
  }

  return {
    async findEligibleGame(gameId) {
      const [game] = await database.select({ id: games.id, ownerId: games.ownerId, visibility: games.visibility, status: games.status, maxPlayers: games.maxPlayers }).from(games).where(eq(games.id, gameId)).limit(1)
      return game ?? null
    },
    async findByGameAndUser(gameId, userId) {
      const [application] = await database.select({ id: applications.id }).from(applications).where(and(eq(applications.gameId, gameId), eq(applications.userId, userId))).limit(1)
      return application ? readApplication(database, application.id) : null
    },
    async create(input) {
      try {
        const [created] = await database.insert(applications).values(input).returning({ id: applications.id })
        if (!created) throw new Error('APPLICATION_CREATE_FAILED')
        const application = await readApplication(database, created.id)
        if (!application) throw new Error('APPLICATION_CREATE_FAILED')
        return application
      } catch (error) {
        if (error instanceof Error && error.message === 'APPLICATION_CREATE_FAILED') throw error
        throw new Error('APPLICATION_CONFLICT')
      }
    },
    async findForUser(userId) {
      const rows = await database.select({
        id: applications.id,
        gameId: applications.gameId,
        gameTitle: games.title,
        userId: applications.userId,
        username: users.username,
        message: applications.message,
        status: applications.status,
        createdAt: applications.createdAt,
        updatedAt: applications.updatedAt,
      }).from(applications).innerJoin(games, eq(applications.gameId, games.id)).innerJoin(users, eq(applications.userId, users.id)).where(eq(applications.userId, userId)).orderBy(desc(applications.createdAt))
      return rows.map((row) => ({ ...row, status: row.status as ApplicationStatus }))
    },
    async findForGameOwner(gameId, ownerId) {
      const [game] = await database.select({ ownerId: games.ownerId }).from(games).where(eq(games.id, gameId)).limit(1)
      if (!game || game.ownerId !== ownerId) return null
      const rows = await database.select({
        id: applications.id,
        gameId: applications.gameId,
        gameTitle: games.title,
        userId: applications.userId,
        username: users.username,
        message: applications.message,
        status: applications.status,
        createdAt: applications.createdAt,
        updatedAt: applications.updatedAt,
      }).from(applications).innerJoin(games, eq(applications.gameId, games.id)).innerJoin(users, eq(applications.userId, users.id)).where(eq(applications.gameId, gameId)).orderBy(desc(applications.createdAt))
      return rows.map((row) => ({ ...row, status: row.status as ApplicationStatus }))
    },
    async decide(applicationId, ownerId, status) {
      return database.transaction(async (tx) => {
        const [application] = await tx.select({
          id: applications.id,
          gameId: applications.gameId,
          gameOwnerId: games.ownerId,
          gameStatus: games.status,
          visibility: games.visibility,
          maxPlayers: games.maxPlayers,
          applicantId: applications.userId,
          applicationStatus: applications.status,
        }).from(applications).innerJoin(games, eq(applications.gameId, games.id)).where(eq(applications.id, applicationId)).for('update').limit(1)
        if (!application) return null
        if (application.gameOwnerId !== ownerId) throw new Error('APPLICATION_FORBIDDEN')
        if (application.applicationStatus !== 'PENDING' || application.gameStatus !== 'OPEN' || application.visibility !== 'PUBLIC') throw new Error('APPLICATION_CONFLICT')
        if (status === 'ACCEPTED') {
          const [members] = await tx.select({ total: count() }).from(gameMembers).where(and(eq(gameMembers.gameId, application.gameId), eq(gameMembers.role, 'PLAYER'), eq(gameMembers.status, 'ACTIVE')))
          if (Number(members?.total ?? 0) >= application.maxPlayers) throw new Error('APPLICATION_CONFLICT')
          await tx.insert(gameMembers).values({ gameId: application.gameId, userId: application.applicantId, role: 'PLAYER', status: 'ACTIVE' })
        }
        await tx.update(applications).set({ status, updatedAt: new Date() }).where(eq(applications.id, applicationId))
        return readApplication(tx, applicationId)
      })
    },
  }
}

import { and, count, eq, lte } from 'drizzle-orm'
import { authSchema, gameSchema, invitationsSchema, type createDatabase } from '@jdr-hub/database'
import { alias } from 'drizzle-orm/pg-core'
import type { GameStatus, Invitation, InvitationStatus } from '@jdr-hub/shared'

const { users } = authSchema
const { games, gameMembers } = gameSchema
const { invitations } = invitationsSchema
const inviter = alias(users, 'inviter')
const invitee = alias(users, 'invitee')

export type InvitationGame = {
  id: string
  ownerId: string
  title: string
  status: GameStatus
  maxPlayers: number
}

export type InvitationRecord = Omit<Invitation, 'expiresAt' | 'createdAt' | 'updatedAt'> & {
  expiresAt: Date
  createdAt: Date
  updatedAt: Date
}

export interface InvitationRepository {
  findGame(gameId: string): Promise<InvitationGame | null>
  isActiveMember(gameId: string, userId: string): Promise<boolean>
  findPending(gameId: string, inviteeId: string): Promise<InvitationRecord | null>
  create(input: { gameId: string; inviterId: string; inviteeId: string; expiresAt: Date; now: Date }): Promise<InvitationRecord>
  listForInvitee(userId: string): Promise<InvitationRecord[]>
  listForOwner(gameId: string, ownerId: string): Promise<InvitationRecord[] | null>
  findById(id: string): Promise<InvitationRecord | null>
  updateStatus(input: { invitationId: string; actorId: string; status: Exclude<InvitationStatus, 'PENDING' | 'EXPIRED'>; now: Date }): Promise<InvitationRecord | null>
}

type Database = ReturnType<typeof createDatabase>['db']

type InvitationRow = {
  id: string
  gameId: string
  gameTitle: string
  inviterId: string
  inviterName: string
  inviteeId: string
  inviteeName: string
  status: string
  expiresAt: Date
  createdAt: Date
  updatedAt: Date
}

const toRecord = (row: InvitationRow): InvitationRecord => ({ ...row, status: row.status as InvitationRecord['status'] })

const invitationSelection = {
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
}

export function createPostgresInvitationRepository(database: Database): InvitationRepository {
  const read = async (db: Pick<Database, 'select'>, id: string): Promise<InvitationRecord | null> => {
    const [row] = await db.select(invitationSelection)
      .from(invitations)
      .innerJoin(games, eq(invitations.gameId, games.id))
      .innerJoin(inviter, eq(invitations.inviterId, inviter.id))
      .innerJoin(invitee, eq(invitations.inviteeId, invitee.id))
      .where(eq(invitations.id, id))
      .limit(1)
    return row ? toRecord(row) : null
  }

  const readMany = async (db: Pick<Database, 'select'>, condition: ReturnType<typeof and>): Promise<InvitationRecord[]> => {
    const rows = await db.select(invitationSelection)
      .from(invitations)
      .innerJoin(games, eq(invitations.gameId, games.id))
      .innerJoin(inviter, eq(invitations.inviterId, inviter.id))
      .innerJoin(invitee, eq(invitations.inviteeId, invitee.id))
      .where(condition)
      .orderBy(invitations.createdAt, invitations.id)
    return rows.map(toRecord)
  }

  return {
    async findGame(gameId) {
      const [row] = await database.select({ id: games.id, ownerId: games.ownerId, title: games.title, status: games.status, maxPlayers: games.maxPlayers })
        .from(games)
        .where(eq(games.id, gameId))
        .limit(1)
      return row ? { ...row, status: row.status as GameStatus } : null
    },
    async isActiveMember(gameId, userId) {
      const [member] = await database.select({ userId: gameMembers.userId })
        .from(gameMembers)
        .where(and(eq(gameMembers.gameId, gameId), eq(gameMembers.userId, userId), eq(gameMembers.status, 'ACTIVE')))
        .limit(1)
      if (member) return true
      const [owner] = await database.select({ id: games.id })
        .from(games)
        .where(and(eq(games.id, gameId), eq(games.ownerId, userId)))
        .limit(1)
      return Boolean(owner)
    },
    async findPending(gameId, inviteeId) {
      const [row] = await database.select({ id: invitations.id })
        .from(invitations)
        .where(and(eq(invitations.gameId, gameId), eq(invitations.inviteeId, inviteeId), eq(invitations.status, 'PENDING')))
        .limit(1)
      return row ? read(database, row.id) : null
    },
    async create(input) {
      try {
        return await database.transaction(async (tx) => {
          const [game] = await tx.select({ id: games.id }).from(games).where(eq(games.id, input.gameId)).for('update').limit(1)
          if (!game) throw new Error('INVITATION_NOT_FOUND')
          await tx.update(invitations)
            .set({ status: 'EXPIRED', updatedAt: input.now })
            .where(and(eq(invitations.gameId, input.gameId), eq(invitations.inviteeId, input.inviteeId), eq(invitations.status, 'PENDING'), lte(invitations.expiresAt, input.now)))
          const [created] = await tx.insert(invitations).values({ ...input }).returning({ id: invitations.id })
          if (!created) throw new Error('INVITATION_CREATE_FAILED')
          const result = await read(tx, created.id)
          if (!result) throw new Error('INVITATION_CREATE_FAILED')
          return result
        })
      } catch (error) {
        if (error instanceof Error && ['INVITATION_NOT_FOUND', 'INVITATION_CREATE_FAILED'].includes(error.message)) throw error
        throw new Error('INVITATION_CONFLICT')
      }
    },
    async listForInvitee(userId) {
      return readMany(database, eq(invitations.inviteeId, userId))
    },
    async listForOwner(gameId, ownerId) {
      const [game] = await database.select({ ownerId: games.ownerId }).from(games).where(eq(games.id, gameId)).limit(1)
      if (!game || game.ownerId !== ownerId) return null
      return readMany(database, eq(invitations.gameId, gameId))
    },
    async findById(id) {
      return read(database, id)
    },
    async updateStatus({ invitationId, actorId, status, now }) {
      return database.transaction(async (tx) => {
        const [row] = await tx.select({
          id: invitations.id,
          gameId: invitations.gameId,
          inviterId: invitations.inviterId,
          inviteeId: invitations.inviteeId,
          gameOwnerId: games.ownerId,
          gameStatus: games.status,
          maxPlayers: games.maxPlayers,
          invitationStatus: invitations.status,
          expiresAt: invitations.expiresAt,
        }).from(invitations)
          .innerJoin(games, eq(invitations.gameId, games.id))
          .where(eq(invitations.id, invitationId))
          .for('update')
          .limit(1)
        if (!row) return null
        const ownerAction = row.gameOwnerId === actorId && status === 'CANCELLED'
        const inviteeAction = row.inviteeId === actorId && (status === 'ACCEPTED' || status === 'REJECTED')
        if (!ownerAction && !inviteeAction) throw new Error('INVITATION_FORBIDDEN')
        if (row.invitationStatus === status) return read(tx, invitationId)
        if (row.invitationStatus !== 'PENDING' || row.expiresAt.getTime() <= now.getTime()) throw new Error('INVITATION_CONFLICT')
        if (status === 'ACCEPTED') {
          const [members] = await tx.select({ total: count() }).from(gameMembers)
            .where(and(eq(gameMembers.gameId, row.gameId), eq(gameMembers.role, 'PLAYER'), eq(gameMembers.status, 'ACTIVE')))
          if (Number(members?.total ?? 0) >= row.maxPlayers) throw new Error('INVITATION_CONFLICT')
          const [existingMember] = await tx.select({ status: gameMembers.status }).from(gameMembers)
            .where(and(eq(gameMembers.gameId, row.gameId), eq(gameMembers.userId, row.inviteeId))).for('update').limit(1)
          if (existingMember?.status === 'ACTIVE') throw new Error('INVITATION_CONFLICT')
          if (existingMember) {
            await tx.update(gameMembers).set({ status: 'ACTIVE' }).where(and(eq(gameMembers.gameId, row.gameId), eq(gameMembers.userId, row.inviteeId)))
          } else {
            await tx.insert(gameMembers).values({ gameId: row.gameId, userId: row.inviteeId, role: 'PLAYER', status: 'ACTIVE' })
          }
        }
        await tx.update(invitations).set({ status, updatedAt: now }).where(eq(invitations.id, invitationId))
        return read(tx, invitationId)
      })
    },
  }
}

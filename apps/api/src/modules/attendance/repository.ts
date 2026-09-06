import { and, eq, isNull, inArray } from 'drizzle-orm'
import { authSchema, attendanceSchema, gameSchema, schedulingSchema, type createDatabase } from '@jdr-hub/database'
import type { AttendanceEntry, AttendanceRecord, SessionContext } from '@jdr-hub/shared'
import type { DiscordDelivery, NotificationRecord } from '../notifications/repository.js'
import { createAbsenceDiscordContent } from '../notifications/discord-content.js'

export type AbsenceEvent = {
  attendance: AttendanceRecord
  notification: NotificationRecord
  delivery: DiscordDelivery
}

export interface AttendanceRepository {
  findSessionContext(sessionId: string, userId: string): Promise<SessionContext | null>
  reportAbsence(input: { sessionId: string; userId: string; now: Date }): Promise<AbsenceEvent>
  finalizeAttendance(input: { sessionId: string; ownerId: string; entries: AttendanceEntry[]; now: Date }): Promise<AttendanceRecord[]>
}

type Database = ReturnType<typeof createDatabase>['db']

type SessionContextRow = {
  sessionId: string
  gameId: string
  gameTitle: string
  sessionStartsAt: Date
  ownerId: string
  gameStatus: string
  sessionStatus: string
  memberStatus: string
  memberDiscordId: string | null
  ownerDiscordId: string | null
}

const toContext = (row: SessionContextRow): SessionContext => ({
  ...row,
  gameStatus: row.gameStatus as SessionContext['gameStatus'],
  sessionStatus: row.sessionStatus as SessionContext['sessionStatus'],
})

const toAttendance = (row: { id: string; sessionId: string; userId: string; status: string; createdAt: Date; updatedAt: Date }): AttendanceRecord => ({
  ...row,
  status: row.status as AttendanceRecord['status'],
})

const toNotification = (row: { id: string; type: string; recipientId: string; gameId: string; sessionId: string; actorId: string; title: string; body: string; readAt: Date | null; createdAt: Date }): NotificationRecord => ({
  ...row,
  type: row.type as NotificationRecord['type'],
})

const toDelivery = (row: { id: string; notificationId: string; recipientDiscordId: string; content: string; channel: string; status: string; attempts: number; nextAttemptAt: Date | null; providerMessageId: string | null; lastErrorCode: string | null }): DiscordDelivery => ({
  ...row,
  channel: row.channel as DiscordDelivery['channel'],
  status: row.status as DiscordDelivery['status'],
})

/** Persists an absence and its two notification projections atomically. */
export function createPostgresAttendanceRepository(database: Database): AttendanceRepository {
  const { users } = authSchema
  const { games, gameMembers } = gameSchema
  const { gameSessions } = schedulingSchema
  const { sessionAttendance, notifications, notificationDeliveries } = attendanceSchema

  const readContext = async (sessionId: string, userId: string, db: Pick<Database, 'select'> = database): Promise<SessionContext | null> => {
    const [row] = await db.select({
      sessionId: gameSessions.id,
      gameId: games.id,
      gameTitle: games.title,
      sessionStartsAt: gameSessions.startsAt,
      ownerId: games.ownerId,
      gameStatus: games.status,
      sessionStatus: gameSessions.status,
      memberStatus: gameMembers.status,
      memberDiscordId: users.discordId,
      ownerDiscordId: users.discordId,
    }).from(gameSessions)
      .innerJoin(games, eq(gameSessions.gameId, games.id))
      .leftJoin(gameMembers, and(eq(gameMembers.gameId, games.id), eq(gameMembers.userId, userId)))
      .leftJoin(users, eq(users.id, userId))
      .where(eq(gameSessions.id, sessionId)).limit(1)

    if (!row) return null
    const [owner] = await db.select({ discordId: users.discordId }).from(users).where(eq(users.id, row.ownerId)).limit(1)
    return toContext({
      ...row,
      memberStatus: row.memberStatus ?? (row.ownerId === userId ? 'ACTIVE' : 'NONE'),
      memberDiscordId: row.memberDiscordId,
      ownerDiscordId: owner?.discordId ?? null,
    })
  }

  const readAttendance = async (sessionId: string, userId: string, db: Pick<Database, 'select'>): Promise<AttendanceRecord | null> => {
    const [row] = await db.select().from(sessionAttendance).where(and(eq(sessionAttendance.sessionId, sessionId), eq(sessionAttendance.userId, userId))).limit(1)
    return row ? toAttendance(row) : null
  }

  const readNotificationByKey = async (logicalKey: string, db: Pick<Database, 'select'>): Promise<NotificationRecord | null> => {
    const [row] = await db.select().from(notifications).where(eq(notifications.logicalKey, logicalKey)).limit(1)
    return row ? toNotification(row) : null
  }

  return {
    async findSessionContext(sessionId, userId) {
      return readContext(sessionId, userId)
    },

    async reportAbsence({ sessionId, userId, now }) {
      return database.transaction(async (tx) => {
        const context = await readContext(sessionId, userId, tx)
        if (!context) throw new Error('ATTENDANCE_NOT_FOUND')
        if (context.memberStatus !== 'ACTIVE') throw new Error('ATTENDANCE_FORBIDDEN')
        if (context.sessionStatus !== 'SCHEDULED' || !['OPEN', 'ACTIVE'].includes(context.gameStatus)) throw new Error('ATTENDANCE_CONFLICT')

        const existing = await readAttendance(sessionId, userId, tx)
        if (existing?.status === 'EXCUSED') {
          const logicalKey = `absence:${sessionId}:${userId}`
          const notification = await readNotificationByKey(logicalKey, tx)
          if (!notification) throw new Error('ATTENDANCE_CONFLICT')
          const [deliveryRow] = await tx.select({
            id: notificationDeliveries.id,
            notificationId: notificationDeliveries.notificationId,
            channel: notificationDeliveries.channel,
            status: notificationDeliveries.status,
            attempts: notificationDeliveries.attempts,
            nextAttemptAt: notificationDeliveries.nextAttemptAt,
            providerMessageId: notificationDeliveries.providerMessageId,
            lastErrorCode: notificationDeliveries.lastErrorCode,
          }).from(notificationDeliveries).where(and(eq(notificationDeliveries.notificationId, notification.id), eq(notificationDeliveries.channel, 'DISCORD_DM'))).limit(1)
          if (!deliveryRow || !context.ownerDiscordId) throw new Error('ATTENDANCE_CONFLICT')
          return { attendance: existing, notification, delivery: toDelivery({ ...deliveryRow, recipientDiscordId: context.ownerDiscordId, content: createAbsenceDiscordContent(context) }) }
        }
        if (existing) throw new Error('ATTENDANCE_CONFLICT')

        const [attendanceRow] = await tx.insert(sessionAttendance).values({ sessionId, userId, status: 'EXCUSED', createdAt: now, updatedAt: now }).returning()
        if (!attendanceRow) throw new Error('ATTENDANCE_CREATE_FAILED')
        if (!context.ownerDiscordId) throw new Error('ATTENDANCE_CREATE_FAILED')
        const logicalKey = `absence:${sessionId}:${userId}`
        const [notificationRow] = await tx.insert(notifications).values({
          type: 'ABSENCE_REPORTED',
          recipientId: context.ownerId,
          gameId: context.gameId,
          sessionId,
          actorId: userId,
          title: 'Absence signalée',
          body: 'Un joueur a signalé son absence pour une séance.',
          logicalKey,
          createdAt: now,
        }).returning()
        if (!notificationRow) throw new Error('ATTENDANCE_CREATE_FAILED')
        const [deliveryRow] = await tx.insert(notificationDeliveries).values({ notificationId: notificationRow.id, channel: 'DISCORD_DM', status: 'PENDING', attempts: 0, createdAt: now, updatedAt: now }).returning()
        if (!deliveryRow) throw new Error('ATTENDANCE_CREATE_FAILED')
        return {
          attendance: toAttendance(attendanceRow),
          notification: toNotification(notificationRow),
          delivery: toDelivery({ ...deliveryRow, recipientDiscordId: context.ownerDiscordId, content: createAbsenceDiscordContent(context) }),
        }
      })
    },

    async finalizeAttendance({ sessionId, ownerId, entries, now }) {
      return database.transaction(async (tx) => {
        const [session] = await tx.select({ gameId: gameSessions.gameId, status: gameSessions.status, gameOwnerId: games.ownerId, gameStatus: games.status })
          .from(gameSessions).innerJoin(games, eq(gameSessions.gameId, games.id)).where(eq(gameSessions.id, sessionId)).for('update').limit(1)
        if (!session) throw new Error('ATTENDANCE_NOT_FOUND')
        if (session.gameOwnerId !== ownerId) throw new Error('ATTENDANCE_FORBIDDEN')
        if (session.status !== 'SCHEDULED' || !['OPEN', 'ACTIVE'].includes(session.gameStatus)) throw new Error('ATTENDANCE_CONFLICT')

        const memberRows = await tx.select({ userId: gameMembers.userId }).from(gameMembers).where(and(eq(gameMembers.gameId, session.gameId), inArray(gameMembers.userId, entries.map((entry) => entry.userId)), eq(gameMembers.status, 'ACTIVE')))
        if (memberRows.length !== entries.length) throw new Error('ATTENDANCE_FORBIDDEN')

        const records: AttendanceRecord[] = []
        for (const entry of entries) {
          const [record] = await tx.insert(sessionAttendance).values({ sessionId, userId: entry.userId, status: entry.status, createdAt: now, updatedAt: now }).onConflictDoUpdate({ target: [sessionAttendance.sessionId, sessionAttendance.userId], set: { status: entry.status, updatedAt: now } }).returning()
          if (!record) throw new Error('ATTENDANCE_UPDATE_FAILED')
          records.push(toAttendance(record))
        }
        await tx.update(gameSessions).set({ status: 'COMPLETED', updatedAt: now }).where(eq(gameSessions.id, sessionId))
        return records
      })
    },
  }
}

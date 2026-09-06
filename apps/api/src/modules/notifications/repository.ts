import { and, asc, desc, eq, isNull, lt, or, sql } from 'drizzle-orm'
import { authSchema, attendanceSchema, gameSchema, schedulingSchema, type createDatabase } from '@jdr-hub/database'
import type { NotificationChannel, NotificationType } from '@jdr-hub/shared'
import { createAbsenceDiscordContent } from './discord-content.js'

export type NotificationRecord = {
  id: string
  type: NotificationType
  recipientId: string
  gameId: string
  sessionId: string
  actorId: string
  title: string
  body: string
  readAt: Date | null
  createdAt: Date
}

export type NotificationPageRecord = {
  items: NotificationRecord[]
  nextCursor: string | null
  unreadCount: number
}

export type DiscordDelivery = {
  id: string
  notificationId: string
  recipientDiscordId: string
  content: string
  channel: Extract<NotificationChannel, 'DISCORD_DM'>
  status: 'PENDING' | 'PROCESSING' | 'SENT' | 'FAILED'
  attempts: number
  nextAttemptAt: Date | null
  providerMessageId: string | null
  lastErrorCode: string | null
}

export interface NotificationRepository {
  listForUser(input: { userId: string; cursor: string | null; limit: number }): Promise<NotificationPageRecord>
  markRead(input: { notificationId: string; userId: string; now: Date }): Promise<boolean>
  claimPendingDeliveries(input: { now: Date; limit: number }): Promise<DiscordDelivery[]>
  markSent(input: { deliveryId: string; providerMessageId: string; now: Date }): Promise<void>
  markRetryableFailure(input: { deliveryId: string; errorCode: string; nextAttemptAt: Date; now: Date }): Promise<void>
  markPermanentFailure(input: { deliveryId: string; errorCode: string; now: Date }): Promise<void>
}

type Database = ReturnType<typeof createDatabase>['db']

const encodeCursor = (notification: Pick<NotificationRecord, 'id' | 'createdAt'>): string => Buffer.from(JSON.stringify({ id: notification.id, createdAt: notification.createdAt.toISOString() }), 'utf8').toString('base64url')

const decodeCursor = (cursor: string | null): { id: string; createdAt: Date } | null => {
  if (!cursor) return null
  try {
    const parsed: unknown = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'))
    if (!parsed || typeof parsed !== 'object' || !('id' in parsed) || !('createdAt' in parsed) || typeof parsed.id !== 'string' || typeof parsed.createdAt !== 'string') return null
    const createdAt = new Date(parsed.createdAt)
    return Number.isNaN(createdAt.getTime()) ? null : { id: parsed.id, createdAt }
  } catch {
    return null
  }
}

const toNotification = (row: { id: string; type: string; recipientId: string; gameId: string; sessionId: string; actorId: string; title: string; body: string; readAt: Date | null; createdAt: Date }): NotificationRecord => ({
  ...row,
  type: row.type as NotificationType,
})

const toDelivery = (row: { id: string; notificationId: string; recipientDiscordId: string; content: string; channel: string; status: string; attempts: number; nextAttemptAt: Date | null; providerMessageId: string | null; lastErrorCode: string | null }): DiscordDelivery => ({
  ...row,
  channel: row.channel as DiscordDelivery['channel'],
  status: row.status as DiscordDelivery['status'],
})

export function createPostgresNotificationRepository(database: Database): NotificationRepository {
  const { users } = authSchema
  const { games } = gameSchema
  const { gameSessions } = schedulingSchema
  const { notifications, notificationDeliveries } = attendanceSchema

  return {
    async listForUser({ userId, cursor, limit }) {
      const decoded = decodeCursor(cursor)
      const cursorCondition = decoded
        ? or(lt(notifications.createdAt, decoded.createdAt), and(eq(notifications.createdAt, decoded.createdAt), lt(notifications.id, decoded.id)))
        : undefined
      const rows = await database.select().from(notifications)
        .where(and(eq(notifications.recipientId, userId), ...(cursorCondition ? [cursorCondition] : [])))
        .orderBy(desc(notifications.createdAt), desc(notifications.id)).limit(limit + 1)
      const items = rows.slice(0, limit).map(toNotification)
      const [unread] = await database.select({ count: sql<number>`count(*)` }).from(notifications).where(and(eq(notifications.recipientId, userId), isNull(notifications.readAt)))
      return { items, nextCursor: rows.length > limit && items.at(-1) ? encodeCursor(items.at(-1) as NotificationRecord) : null, unreadCount: Number(unread?.count ?? 0) }
    },

    async markRead({ notificationId, userId, now }) {
      const [notification] = await database.select({ id: notifications.id }).from(notifications).where(and(eq(notifications.id, notificationId), eq(notifications.recipientId, userId))).limit(1)
      if (!notification) return false
      await database.update(notifications).set({ readAt: now }).where(and(eq(notifications.id, notificationId), eq(notifications.recipientId, userId), isNull(notifications.readAt)))
      return true
    },

    async claimPendingDeliveries({ now, limit }) {
      return database.transaction(async (tx) => {
        const candidates = await tx.select({
          id: notificationDeliveries.id,
          notificationId: notificationDeliveries.notificationId,
          recipientDiscordId: users.discordId,
          gameTitle: games.title,
          sessionStartsAt: gameSessions.startsAt,
          channel: notificationDeliveries.channel,
          status: notificationDeliveries.status,
          attempts: notificationDeliveries.attempts,
          nextAttemptAt: notificationDeliveries.nextAttemptAt,
          providerMessageId: notificationDeliveries.providerMessageId,
          lastErrorCode: notificationDeliveries.lastErrorCode,
        }).from(notificationDeliveries)
          .innerJoin(notifications, eq(notificationDeliveries.notificationId, notifications.id))
          .innerJoin(games, eq(notifications.gameId, games.id))
          .innerJoin(gameSessions, eq(notifications.sessionId, gameSessions.id))
          .innerJoin(users, eq(notifications.recipientId, users.id))
          .where(and(eq(notificationDeliveries.channel, 'DISCORD_DM'), eq(notificationDeliveries.status, 'PENDING'), lt(notificationDeliveries.attempts, 5), or(isNull(notificationDeliveries.nextAttemptAt), sql`${notificationDeliveries.nextAttemptAt} <= ${now}`)))
          .orderBy(asc(notificationDeliveries.nextAttemptAt), asc(notificationDeliveries.createdAt))
          .limit(limit).for('update', { skipLocked: true })

        const claimed: DiscordDelivery[] = []
        for (const candidate of candidates) {
          const [updated] = await tx.update(notificationDeliveries).set({ status: 'PROCESSING', attempts: sql`${notificationDeliveries.attempts} + 1`, updatedAt: now }).where(and(eq(notificationDeliveries.id, candidate.id), eq(notificationDeliveries.status, 'PENDING'))).returning({ attempts: notificationDeliveries.attempts })
          if (updated) claimed.push(toDelivery({ ...candidate, content: createAbsenceDiscordContent({ gameTitle: candidate.gameTitle, sessionStartsAt: candidate.sessionStartsAt }), status: 'PROCESSING', attempts: updated.attempts }))
        }
        return claimed
      })
    },

    async markSent({ deliveryId, providerMessageId, now }) {
      await database.update(notificationDeliveries).set({ status: 'SENT', providerMessageId, updatedAt: now }).where(and(eq(notificationDeliveries.id, deliveryId), eq(notificationDeliveries.status, 'PROCESSING')))
    },

    async markRetryableFailure({ deliveryId, errorCode, nextAttemptAt, now }) {
      await database.update(notificationDeliveries).set({ status: 'PENDING', nextAttemptAt, lastErrorCode: errorCode, updatedAt: now }).where(and(eq(notificationDeliveries.id, deliveryId), eq(notificationDeliveries.status, 'PROCESSING')))
    },

    async markPermanentFailure({ deliveryId, errorCode, now }) {
      await database.update(notificationDeliveries).set({ status: 'FAILED', lastErrorCode: errorCode, updatedAt: now }).where(and(eq(notificationDeliveries.id, deliveryId), eq(notificationDeliveries.status, 'PROCESSING')))
    },
  }
}

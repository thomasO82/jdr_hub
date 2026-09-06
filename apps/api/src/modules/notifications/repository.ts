import { and, desc, eq, isNull, lt, or, sql } from 'drizzle-orm'
import { attendanceSchema, type createDatabase } from '@jdr-hub/database'
import type { NotificationType } from '@jdr-hub/shared'

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

export interface NotificationRepository {
  listForUser(input: { userId: string; cursor: string | null; limit: number }): Promise<NotificationPageRecord>
  markRead(input: { notificationId: string; userId: string; now: Date }): Promise<boolean>
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

export function createPostgresNotificationRepository(database: Database): NotificationRepository {
  const { notifications } = attendanceSchema

  return {
    async listForUser({ userId, cursor, limit }) {
      const decoded = decodeCursor(cursor)
      if (cursor && !decoded) throw new Error('NOTIFICATION_INVALID_CURSOR')
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
  }
}

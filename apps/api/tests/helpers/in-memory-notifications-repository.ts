import type { NotificationPageRecord, NotificationRecord, NotificationRepository } from '../../src/modules/notifications/repository.js'

type InMemoryNotificationsRepository = NotificationRepository & {
  notifications: NotificationRecord[]
}

export function createInMemoryNotificationsRepository(input: { notifications?: NotificationRecord[] } = {}): InMemoryNotificationsRepository {
  const notifications = (input.notifications ?? []).map((notification) => ({ ...notification }))
  return {
    notifications,
    async listForUser({ userId, cursor, limit }): Promise<NotificationPageRecord> {
      if (cursor && !/^\d+$/.test(cursor)) throw new Error('NOTIFICATION_INVALID_CURSOR')
      const sorted = notifications
        .filter((notification) => notification.recipientId === userId)
        .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
      const offset = cursor ? Number(cursor) : 0
      const items = sorted.slice(offset, offset + limit)
      return {
        items,
        nextCursor: offset + items.length < sorted.length ? String(offset + items.length) : null,
        unreadCount: sorted.filter((notification) => notification.readAt === null).length,
      }
    },
    async markRead({ notificationId, userId, now }) {
      const notification = notifications.find((item) => item.id === notificationId && item.recipientId === userId)
      if (!notification) return false
      notification.readAt ??= now
      return true
    },
  }
}

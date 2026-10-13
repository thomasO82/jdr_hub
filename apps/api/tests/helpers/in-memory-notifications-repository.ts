import type { DiscordDelivery, NotificationDeliveryRepository, NotificationPageRecord, NotificationRecord } from '../../src/modules/notifications/repository.js'

type InMemoryNotificationsRepository = NotificationDeliveryRepository & {
  notifications: NotificationRecord[]
  deliveries: DiscordDelivery[]
}

export function createInMemoryNotificationsRepository(input: { notifications?: NotificationRecord[]; deliveries?: DiscordDelivery[] } = {}): InMemoryNotificationsRepository {
  const notifications = (input.notifications ?? []).map((notification) => ({ ...notification }))
  const deliveries = (input.deliveries ?? []).map((delivery) => ({ ...delivery }))
  return {
    notifications,
    deliveries,
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
    async listUnreadForUser({ userId, limit }) {
      const unread = notifications
        .filter((notification) => notification.recipientId === userId && notification.readAt === null)
        .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
      return { items: unread.slice(0, limit), unreadCount: unread.length }
    },
    async markRead({ notificationId, userId, now }) {
      const notification = notifications.find((item) => item.id === notificationId && item.recipientId === userId)
      if (!notification) return false
      notification.readAt ??= now
      return true
    },
    async claimPendingDeliveries({ now, limit }) {
      const ready = deliveries.filter((item) => item.status === 'PENDING' && (!item.nextAttemptAt || item.nextAttemptAt <= now)).slice(0, limit)
      for (const item of ready) {
        item.status = 'PROCESSING'
        item.attempts += 1
        item.processingAt = now
      }
      return ready
    },
    async markSent({ deliveryId, providerMessageId, now }) {
      const item = deliveries.find((delivery) => delivery.id === deliveryId)
      if (item) Object.assign(item, { status: 'SENT', providerMessageId, processingAt: null, updatedAt: now })
    },
    async markRetryableFailure({ deliveryId, errorCode, nextAttemptAt, now }) {
      const item = deliveries.find((delivery) => delivery.id === deliveryId)
      if (item) Object.assign(item, { status: 'PENDING', nextAttemptAt, lastErrorCode: errorCode, processingAt: null, updatedAt: now })
    },
    async markPermanentFailure({ deliveryId, errorCode, now }) {
      const item = deliveries.find((delivery) => delivery.id === deliveryId)
      if (item) Object.assign(item, { status: 'FAILED', lastErrorCode: errorCode, processingAt: null, updatedAt: now })
    },
  }
}

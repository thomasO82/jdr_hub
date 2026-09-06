import type { DiscordDelivery, NotificationPageRecord, NotificationRecord, NotificationRepository } from '../../src/modules/notifications/repository.js'

type InMemoryNotificationsRepository = NotificationRepository & {
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
      const sorted = notifications.filter((notification) => notification.recipientId === userId).sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
      const offset = cursor ? Number(cursor) : 0
      const items = sorted.slice(offset, offset + limit)
      return { items, nextCursor: offset + items.length < sorted.length ? String(offset + items.length) : null, unreadCount: sorted.filter((notification) => notification.readAt === null).length }
    },
    async markRead({ notificationId, userId, now }) {
      const notification = notifications.find((item) => item.id === notificationId && item.recipientId === userId)
      if (!notification) return false
      notification.readAt ??= now
      return true
    },
    async claimPendingDeliveries({ now, limit }) {
      return deliveries.filter((delivery) => delivery.status === 'PENDING' && (!delivery.nextAttemptAt || delivery.nextAttemptAt <= now)).slice(0, limit).map((delivery) => {
        delivery.status = 'PROCESSING'
        delivery.attempts += 1
        return delivery
      })
    },
    async markSent({ deliveryId, providerMessageId, now }) {
      const delivery = deliveries.find((item) => item.id === deliveryId)
      if (!delivery || delivery.status === 'SENT') return
      delivery.status = 'SENT'
      delivery.providerMessageId = providerMessageId
      delivery.updatedAt = now
    },
    async markRetryableFailure({ deliveryId, errorCode, nextAttemptAt, now }) {
      const delivery = deliveries.find((item) => item.id === deliveryId)
      if (!delivery || delivery.status === 'SENT') return
      delivery.status = 'PENDING'
      delivery.lastErrorCode = errorCode
      delivery.nextAttemptAt = nextAttemptAt
      delivery.updatedAt = now
    },
    async markPermanentFailure({ deliveryId, errorCode, now }) {
      const delivery = deliveries.find((item) => item.id === deliveryId)
      if (!delivery || delivery.status === 'SENT') return
      delivery.status = 'FAILED'
      delivery.lastErrorCode = errorCode
      delivery.updatedAt = now
    },
  }
}

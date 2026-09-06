import type { DiscordDelivery, NotificationPageRecord, NotificationRecord, NotificationRepository } from '../../src/modules/notifications/repository.js'
import { MAX_NOTIFICATION_DELIVERY_ATTEMPTS, NOTIFICATION_PROCESSING_LEASE_MS } from '../../src/modules/notifications/repository.js'

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
      if (cursor && !/^\d+$/.test(cursor)) throw new Error('NOTIFICATION_INVALID_CURSOR')
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
      const staleBefore = new Date(now.getTime() - NOTIFICATION_PROCESSING_LEASE_MS)
      for (const delivery of deliveries) {
        if (delivery.status !== 'PROCESSING' || !delivery.processingAt || delivery.processingAt >= staleBefore) continue
        if (delivery.attempts >= MAX_NOTIFICATION_DELIVERY_ATTEMPTS) {
          delivery.status = 'FAILED'
          delivery.lastErrorCode = 'DISCORD_WORKER_TIMEOUT'
          delivery.processingAt = null
        } else {
          delivery.status = 'PENDING'
          delivery.nextAttemptAt = now
          delivery.lastErrorCode = 'DISCORD_WORKER_TIMEOUT'
          delivery.processingAt = null
        }
      }
      return deliveries.filter((delivery) => delivery.status === 'PENDING' && (!delivery.nextAttemptAt || delivery.nextAttemptAt <= now)).slice(0, limit).map((delivery) => {
        delivery.status = 'PROCESSING'
        delivery.attempts += 1
        delivery.processingAt = now
        return delivery
      })
    },
    async markSent({ deliveryId, providerMessageId, now }) {
      const delivery = deliveries.find((item) => item.id === deliveryId)
      if (!delivery || delivery.status === 'SENT') return
      delivery.status = 'SENT'
      delivery.providerMessageId = providerMessageId
      delivery.processingAt = null
      delivery.updatedAt = now
    },
    async markRetryableFailure({ deliveryId, errorCode, nextAttemptAt, now }) {
      const delivery = deliveries.find((item) => item.id === deliveryId)
      if (!delivery || delivery.status === 'SENT') return
      delivery.status = 'PENDING'
      delivery.lastErrorCode = errorCode
      delivery.nextAttemptAt = nextAttemptAt
      delivery.processingAt = null
      delivery.updatedAt = now
    },
    async markPermanentFailure({ deliveryId, errorCode, now }) {
      const delivery = deliveries.find((item) => item.id === deliveryId)
      if (!delivery || delivery.status === 'SENT') return
      delivery.status = 'FAILED'
      delivery.lastErrorCode = errorCode
      delivery.processingAt = null
      delivery.updatedAt = now
    },
  }
}

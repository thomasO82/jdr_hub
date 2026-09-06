import type { NotificationsPage } from '@jdr-hub/shared'
import type { NotificationRepository } from '../repository.js'

export async function listNotifications(input: { userId: string; cursor: string | null; limit: number; repository: NotificationRepository }): Promise<NotificationsPage> {
  const page = await input.repository.listForUser({ userId: input.userId, cursor: input.cursor, limit: input.limit })
  return {
    items: page.items.map((notification) => ({ ...notification, readAt: notification.readAt?.toISOString() ?? null, createdAt: notification.createdAt.toISOString() })),
    nextCursor: page.nextCursor,
    unreadCount: page.unreadCount,
  }
}

import type { DashboardNotificationSummary } from '@jdr-hub/shared'
import type { NotificationRepository } from '../repository.js'

export async function listUnreadNotifications(input: { userId: string; limit: number; repository: NotificationRepository }): Promise<DashboardNotificationSummary> {
  const page = await input.repository.listUnreadForUser({ userId: input.userId, limit: Math.min(Math.max(input.limit, 1), 3) })
  return {
    unreadCount: page.unreadCount,
    items: page.items.map((notification) => ({
      id: notification.id,
      type: notification.type,
      gameId: notification.gameId,
      sessionId: notification.sessionId,
      title: notification.title,
      body: notification.body,
      readAt: null,
      createdAt: notification.createdAt.toISOString(),
    })),
  }
}

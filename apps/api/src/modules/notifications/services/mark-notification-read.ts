import type { NotificationRepository } from '../repository.js'

export async function markNotificationRead(input: { notificationId: string; userId: string; repository: NotificationRepository; now?: () => Date }): Promise<boolean> {
  return input.repository.markRead({ notificationId: input.notificationId, userId: input.userId, now: (input.now ?? (() => new Date()))() })
}

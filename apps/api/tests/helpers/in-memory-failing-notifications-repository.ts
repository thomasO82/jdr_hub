import type { NotificationRepository } from '../../src/modules/notifications/repository.js'
import { createInMemoryNotificationsRepository } from './in-memory-notifications-repository.js'

export function createFailingNotificationsRepository(): NotificationRepository {
  const repository = createInMemoryNotificationsRepository()
  return {
    ...repository,
    async listUnreadForUser() {
      throw new Error('NOTIFICATION_STORAGE_FAILURE')
    },
  }
}

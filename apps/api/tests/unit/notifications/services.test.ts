import { describe, expect, it } from 'vitest'
import { listNotifications } from '../../../src/modules/notifications/services/list-notifications.js'
import { markNotificationRead } from '../../../src/modules/notifications/services/mark-notification-read.js'
import { createInMemoryNotificationsRepository } from '../../helpers/in-memory-notifications-repository.js'

const notification = {
  id: 'notification-1',
  type: 'ABSENCE_REPORTED' as const,
  recipientId: 'gm-1',
  gameId: 'game-1',
  sessionId: 'session-1',
  actorId: 'player-1',
  title: 'Absence signalée',
  body: 'Un joueur a signalé son absence pour une séance.',
  readAt: null,
  createdAt: new Date('2026-09-06T12:00:00.000Z'),
}

describe('notification services', () => {
  it('lists only the current user notifications and serializes dates', async () => {
    const repository = createInMemoryNotificationsRepository({ notifications: [notification, { ...notification, id: 'notification-2', recipientId: 'player-2' }] })
    const result = await listNotifications({ userId: 'gm-1', cursor: null, limit: 20, repository })

    expect(result).toMatchObject({ unreadCount: 1, nextCursor: null })
    expect(result.items).toHaveLength(1)
    expect(result.items[0]).toMatchObject({ id: 'notification-1', createdAt: '2026-09-06T12:00:00.000Z', readAt: null })
  })

  it('marks a notification read only for its recipient and is idempotent', async () => {
    const repository = createInMemoryNotificationsRepository({ notifications: [notification] })
    const now = new Date('2026-09-06T13:00:00.000Z')

    await expect(markNotificationRead({ notificationId: 'notification-1', userId: 'outsider', repository, now: () => now })).resolves.toBe(false)
    expect(repository.notifications[0]?.readAt).toBeNull()
    await expect(markNotificationRead({ notificationId: 'notification-1', userId: 'gm-1', repository, now: () => now })).resolves.toBe(true)
    await expect(markNotificationRead({ notificationId: 'notification-1', userId: 'gm-1', repository, now: () => now })).resolves.toBe(true)
    expect(repository.notifications[0]?.readAt).toEqual(now)
  })
})

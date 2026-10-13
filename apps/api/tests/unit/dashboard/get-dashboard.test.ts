import { describe, expect, it } from 'vitest'
import type { DashboardGameSummary, DashboardSessionSummary } from '@jdr-hub/shared'
import { getDashboard } from '../../../src/modules/dashboard/services/get-dashboard.js'
import type { NotificationRecord, NotificationRepository } from '../../../src/modules/notifications/repository.js'
import { createInMemoryDashboardRepository } from '../../helpers/in-memory-dashboard-repository.js'
import { createFailingNotificationsRepository } from '../../helpers/in-memory-failing-notifications-repository.js'
import { createInMemoryNotificationsRepository } from '../../helpers/in-memory-notifications-repository.js'

const now = new Date('2026-09-08T12:00:00.000Z')
const nextSessionFixture: DashboardSessionSummary = {
  id: 'session-1',
  gameId: 'game-1',
  gameTitle: 'La Crypte Maudite',
  startsAt: '2026-09-08T20:00:00.000Z',
  endsAt: '2026-09-08T23:00:00.000Z',
  status: 'SCHEDULED',
  role: 'GM',
  canReportAbsence: false,
}
const activeGameFixture: DashboardGameSummary = {
  id: 'game-1',
  title: 'La Crypte Maudite',
  system: 'D&D 5e',
  type: 'CAMPAIGN',
  status: 'ACTIVE',
  role: 'GM',
}
const unreadNotificationFixture: NotificationRecord = {
  id: 'notification-1',
  type: 'ABSENCE_REPORTED',
  recipientId: 'gm-1',
  gameId: 'game-1',
  sessionId: 'session-1',
  actorId: 'player-1',
  title: 'Absence signalée',
  body: 'Un joueur a signalé son absence pour une séance.',
  readAt: null,
  createdAt: new Date('2026-09-08T10:00:00.000Z'),
}

describe('getDashboard', () => {
  it('returns the next session, active games and the visible unread notification block', async () => {
    const result = await getDashboard({
      userId: 'gm-1',
      now,
      repository: createInMemoryDashboardRepository({ nextSession: nextSessionFixture, activeGames: [activeGameFixture] }),
      notificationsRepository: createInMemoryNotificationsRepository({ notifications: [unreadNotificationFixture] }),
    })

    expect(result.nextSession.status).toBe('READY')
    expect(result.activeGames.status).toBe('READY')
    expect(result.notifications).toMatchObject({ status: 'READY', data: { unreadCount: 1 } })
  })

  it('returns an empty notification block when there are no unread notifications', async () => {
    const result = await getDashboard({
      userId: 'player-1',
      now,
      repository: createInMemoryDashboardRepository(),
      notificationsRepository: createInMemoryNotificationsRepository(),
    })

    expect(result.notifications).toEqual({ status: 'EMPTY', data: null })
  })

  it('keeps successful blocks when the notifications repository fails', async () => {
    const notificationsRepository: NotificationRepository = createFailingNotificationsRepository()
    const result = await getDashboard({
      userId: 'gm-1',
      now,
      repository: createInMemoryDashboardRepository({ nextSession: nextSessionFixture, activeGames: [activeGameFixture] }),
      notificationsRepository,
    })

    expect(result.nextSession.status).toBe('READY')
    expect(result.activeGames.status).toBe('READY')
    expect(result.notifications).toEqual({ status: 'ERROR', data: null, code: 'DASHBOARD_BLOCK_UNAVAILABLE' })
  })
})

import type { DashboardBlock, DashboardData } from '@jdr-hub/shared'
import { listUnreadNotifications } from '../../notifications/services/list-unread-notifications.js'
import type { NotificationRepository } from '../../notifications/repository.js'
import type { DashboardRepository } from '../repository.js'

const errorBlock = (): DashboardBlock<never> => ({ status: 'ERROR', data: null, code: 'DASHBOARD_BLOCK_UNAVAILABLE' })

export async function getDashboard(input: { userId: string; now: Date; repository: DashboardRepository; notificationsRepository: NotificationRepository }): Promise<DashboardData> {
  const [nextSession, activeGames, notifications] = await Promise.allSettled([
    input.repository.findNextSession({ userId: input.userId, now: input.now }),
    input.repository.listActiveGames({ userId: input.userId }),
    listUnreadNotifications({ userId: input.userId, limit: 3, repository: input.notificationsRepository }),
  ])

  const nextSessionBlock: DashboardData['nextSession'] = nextSession.status === 'rejected'
    ? errorBlock()
    : nextSession.value ? { status: 'READY', data: nextSession.value } : { status: 'EMPTY', data: null }
  const activeGamesBlock: DashboardData['activeGames'] = activeGames.status === 'rejected'
    ? errorBlock()
    : { status: 'READY', data: activeGames.value }
  const notificationsBlock: DashboardData['notifications'] = notifications.status === 'rejected'
    ? errorBlock()
    : notifications.value.unreadCount > 0 ? { status: 'READY', data: notifications.value } : { status: 'EMPTY', data: null }

  return { nextSession: nextSessionBlock, activeGames: activeGamesBlock, notifications: notificationsBlock }
}

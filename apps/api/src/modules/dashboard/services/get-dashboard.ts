import type { DashboardApplicationSummary, DashboardBlock, DashboardInvitationSummary, DashboardView } from '@jdr-hub/shared'
import type { DashboardRepository } from '../repository.js'

const sourceError = { code: 'DASHBOARD_SOURCE_ERROR', message: 'Ce bloc n’a pas pu être chargé. Réessayez plus tard.' }

function isEmpty(value: unknown): boolean {
  if (Array.isArray(value)) return value.length === 0
  if (value === null) return true
  if (typeof value === 'object' && value !== null) return Object.values(value).every((item) => item === 0 || item === null)
  return false
}

function block<T>(result: PromiseSettledResult<T>): DashboardBlock<Exclude<T, null>> {
  if (result.status === 'rejected') return { status: 'ERROR', data: null, error: sourceError }
  const value = result.value as Exclude<T, null>
  return isEmpty(value) ? { status: 'EMPTY', data: null, error: null } : { status: 'READY', data: value, error: null }
}

export async function getDashboard(input: { userId: string; repository: DashboardRepository; now?: () => Date }): Promise<DashboardView> {
  const now = (input.now ?? (() => new Date()))()
  const user = await input.repository.getUser(input.userId)
  if (!user) throw new Error('DASHBOARD_NOT_FOUND')
  const [nextSession, activeGames, applications, invitations, schedulingActions, attendanceActions] = await Promise.allSettled([
    input.repository.getNextSession(input.userId, now),
    input.repository.listActiveGames(input.userId),
    input.repository.listApplicationSummary(input.userId),
    input.repository.listInvitationSummary(input.userId, now),
    input.repository.listSchedulingActions(input.userId, now),
    input.repository.listAttendanceActions(input.userId, now),
  ])
  return {
    user,
    nextSession: block(nextSession),
    activeGames: block(activeGames),
    applications: block<DashboardApplicationSummary>(applications),
    invitations: block<DashboardInvitationSummary>(invitations),
    schedulingActions: block(schedulingActions),
    attendanceActions: block(attendanceActions),
    progression: { status: 'EMPTY', data: null, error: null },
  }
}

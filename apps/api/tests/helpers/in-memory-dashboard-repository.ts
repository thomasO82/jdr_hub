import type {
  AttendanceAction,
  DashboardApplication,
  DashboardApplicationSummary,
  DashboardGame,
  DashboardInvitationSummary,
  DashboardSession,
  DashboardUser,
  GameManagementView,
  SchedulingAction,
} from '@jdr-hub/shared'
import type { DashboardRepository } from '../../src/modules/dashboard/repository.js'

const userId = '00000000-0000-4000-8000-000000000001'
const gameId = '00000000-0000-4000-8000-000000000010'
const now = new Date('2026-09-06T12:00:00.000Z')

export function createInMemoryDashboardRepository(input: { populated?: boolean; userId?: string; ownerId?: string; fail?: Array<'nextSession' | 'activeGames' | 'applications' | 'invitations' | 'scheduling' | 'attendance' | 'management'> } = {}): DashboardRepository {
  const shouldFail = (source: string) => input.fail?.includes(source as never)
  const primaryUserId = input.userId ?? userId
  const managementOwnerId = input.ownerId ?? primaryUserId
  const user: DashboardUser = { id: primaryUserId, username: 'MJ', avatarUrl: null }
  const game: DashboardGame = { id: gameId, slug: 'la-crypte', title: 'La crypte', system: 'D&D', type: 'CAMPAIGN', status: 'ACTIVE', maxPlayers: 4, activePlayers: 2, role: 'GM' }
  const session: DashboardSession = { id: 'session-1', gameId, gameTitle: 'La crypte', startsAt: '2026-09-10T18:00:00.000Z', endsAt: '2026-09-10T22:00:00.000Z', status: 'SCHEDULED', notes: null }
  const applications: DashboardApplication[] = [{ id: 'application-1', gameId, gameTitle: 'La crypte', userId: '00000000-0000-4000-8000-000000000002', username: 'Joueur', message: null, status: 'PENDING', createdAt: now.toISOString(), updatedAt: now.toISOString() }]
  const management: GameManagementView = { game, members: [{ gameId, userId: primaryUserId, username: 'MJ', avatarUrl: null, role: 'GM', status: 'ACTIVE', joinedAt: now.toISOString() }], applications, invitations: [], nextSession: session, openProposalCount: 1 }
  const emptyOr = <T>(value: T, empty: T): T => input.populated ? value : empty

  return {
    async getUser(requestedUserId) { return { ...user, id: requestedUserId, username: requestedUserId === primaryUserId ? 'MJ' : 'Joueur' } },
    async getNextSession() { if (shouldFail('nextSession')) throw new Error('database next session'); return emptyOr(session, null) },
    async listActiveGames() { if (shouldFail('activeGames')) throw new Error('database active games'); return emptyOr([game], []) },
    async listApplicationSummary(): Promise<DashboardApplicationSummary> { if (shouldFail('applications')) throw new Error('database applications'); return emptyOr({ pending: 1, accepted: 2, rejected: 0 }, { pending: 0, accepted: 0, rejected: 0 }) },
    async listInvitationSummary(): Promise<DashboardInvitationSummary> { if (shouldFail('invitations')) throw new Error('database invitations'); return emptyOr({ receivedPending: 1, sentPending: 2 }, { receivedPending: 0, sentPending: 0 }) },
    async listSchedulingActions(): Promise<SchedulingAction[]> { if (shouldFail('scheduling')) throw new Error('database scheduling'); return emptyOr([{ kind: 'VOTE', gameId, gameTitle: 'La crypte', proposalId: 'proposal-1', sessionId: null, startsAt: session.startsAt }], []) },
    async listAttendanceActions(): Promise<AttendanceAction[]> { if (shouldFail('attendance')) throw new Error('database attendance'); return emptyOr([{ sessionId: session.id, gameId, gameTitle: 'La crypte', startsAt: session.startsAt }], []) },
    async getGameManagement(_gameId, ownerId) { if (shouldFail('management')) throw new Error('database management'); return input.populated && ownerId === managementOwnerId ? management : null },
  }
}

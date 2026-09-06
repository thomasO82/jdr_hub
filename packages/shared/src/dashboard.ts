import { z } from 'zod'
import type { GameStatus, GameType } from './games.js'
import type { Invitation } from './invitations.js'

export const dashboardBlockStateSchema = z.enum(['READY', 'EMPTY', 'ERROR'])

export type DashboardBlock<T> = {
  status: z.infer<typeof dashboardBlockStateSchema>
  data: T | null
  error: { code: string; message: string } | null
}

export type DashboardUser = {
  id: string
  username: string
  avatarUrl: string | null
}

export type DashboardGame = {
  id: string
  slug: string
  title: string
  system: string
  type: GameType
  status: GameStatus
  maxPlayers: number
  activePlayers: number
  role: 'GM' | 'PLAYER'
}

export type DashboardSession = {
  id: string
  gameId: string
  gameTitle: string
  startsAt: string
  endsAt: string
  status: 'PROPOSED' | 'SCHEDULED' | 'COMPLETED' | 'CANCELLED'
  notes: string | null
}

export type DashboardApplicationSummary = {
  pending: number
  accepted: number
  rejected: number
}

export type DashboardInvitationSummary = {
  receivedPending: number
  sentPending: number
}

export type SchedulingAction = {
  kind: 'VOTE' | 'SESSION'
  gameId: string
  gameTitle: string
  proposalId: string | null
  sessionId: string | null
  startsAt: string | null
}

export type AttendanceAction = {
  sessionId: string
  gameId: string
  gameTitle: string
  startsAt: string
}

export type DashboardProgression = {
  totalXp: number
  level: number
  nextLevelXp: number | null
}

export type GameMemberView = {
  gameId: string
  userId: string
  username: string
  avatarUrl: string | null
  role: 'PLAYER' | 'GM'
  status: 'ACTIVE' | 'REMOVED'
  joinedAt: string
}

export type DashboardApplication = {
  id: string
  gameId: string
  gameTitle: string
  userId: string
  username: string
  message: string | null
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED'
  createdAt: string
  updatedAt: string
}

export type DashboardView = {
  user: DashboardUser
  nextSession: DashboardBlock<DashboardSession>
  activeGames: DashboardBlock<DashboardGame[]>
  applications: DashboardBlock<DashboardApplicationSummary>
  invitations: DashboardBlock<DashboardInvitationSummary>
  schedulingActions: DashboardBlock<SchedulingAction[]>
  attendanceActions: DashboardBlock<AttendanceAction[]>
  progression: DashboardBlock<DashboardProgression>
}

export type GameManagementView = {
  game: DashboardGame
  members: GameMemberView[]
  applications: DashboardApplication[]
  invitations: Invitation[]
  nextSession: DashboardSession | null
  openProposalCount: number
}

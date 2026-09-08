import { z } from 'zod'
import { gameStatusSchema, gameTypeSchema } from './games.js'
import { notificationTypeSchema } from './attendance.js'
import { sessionStatusSchema } from './scheduling.js'
import type { Invitation } from './invitations.js'

const dashboardRoleSchema = z.enum(['GM', 'PLAYER'])

export const dashboardBlockStateSchema = z.enum(['READY', 'EMPTY', 'ERROR'])

export const dashboardSessionSchema = z.object({
  id: z.string().trim().min(1).max(128),
  gameId: z.string().trim().min(1).max(128),
  gameTitle: z.string().trim().min(1).max(160),
  startsAt: z.iso.datetime({ offset: true }),
  endsAt: z.iso.datetime({ offset: true }),
  status: sessionStatusSchema,
  role: dashboardRoleSchema,
  canReportAbsence: z.boolean(),
}).strict()

export const dashboardGameSchema = z.object({
  id: z.string().trim().min(1).max(128),
  title: z.string().trim().min(1).max(160),
  system: z.string().trim().min(1).max(100),
  type: gameTypeSchema,
  status: gameStatusSchema,
  role: dashboardRoleSchema,
}).strict()

export const dashboardNotificationSchema = z.object({
  id: z.string().trim().min(1).max(128),
  type: notificationTypeSchema,
  gameId: z.string().trim().min(1).max(128),
  sessionId: z.string().trim().min(1).max(128),
  title: z.string().trim().min(1).max(160),
  body: z.string().trim().min(1).max(2_000),
  readAt: z.null(),
  createdAt: z.iso.datetime({ offset: true }),
}).strict()

export const dashboardBlockSchema = <T extends z.ZodType>(data: T) => z.discriminatedUnion('status', [
  z.object({ status: z.literal('READY'), data }).strict(),
  z.object({ status: z.literal('EMPTY'), data: z.null() }).strict(),
  z.object({ status: z.literal('ERROR'), data: z.null(), code: z.literal('DASHBOARD_BLOCK_UNAVAILABLE') }).strict(),
])

export const dashboardNotificationSummarySchema = z.object({
  unreadCount: z.number().int().min(1).max(10_000),
  items: z.array(dashboardNotificationSchema).max(3),
}).strict()

export const dashboardDataSchema = z.object({
  nextSession: dashboardBlockSchema(dashboardSessionSchema),
  activeGames: dashboardBlockSchema(z.array(dashboardGameSchema).max(12)),
  notifications: dashboardBlockSchema(dashboardNotificationSummarySchema),
}).strict()

export type DashboardRole = z.infer<typeof dashboardRoleSchema>
export type DashboardSessionSummary = z.infer<typeof dashboardSessionSchema>
export type DashboardGameSummary = z.infer<typeof dashboardGameSchema>
export type DashboardNotification = z.infer<typeof dashboardNotificationSchema>
export type DashboardNotificationSummary = z.infer<typeof dashboardNotificationSummarySchema>

export type DashboardBlock<T> =
  | { status: 'READY'; data: T; error?: null }
  | { status: 'EMPTY'; data: null; error?: null }
  | { status: 'ERROR'; data: null; code?: 'DASHBOARD_BLOCK_UNAVAILABLE'; error?: { code: string; message: string } }

export type DashboardData = z.infer<typeof dashboardDataSchema>

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
  type: z.infer<typeof gameTypeSchema>
  status: z.infer<typeof gameStatusSchema>
  maxPlayers: number
  activePlayers: number
  role: DashboardRole
}

export type DashboardSession = {
  id: string
  gameId: string
  gameTitle: string
  startsAt: string
  endsAt: string
  status: z.infer<typeof sessionStatusSchema>
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
  notifications: DashboardBlock<DashboardNotificationSummary>
}

export type GameManagementView = {
  game: DashboardGame
  members: GameMemberView[]
  applications: DashboardApplication[]
  invitations: Invitation[]
  nextSession: DashboardSession | null
  openProposalCount: number
}

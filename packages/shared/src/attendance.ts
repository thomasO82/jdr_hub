import { z } from 'zod'
import type { GameStatus } from './games.js'
import type { SessionStatus } from './scheduling.js'

export const attendanceStatusSchema = z.enum(['PENDING', 'PRESENT', 'ABSENT', 'EXCUSED'])
export const notificationTypeSchema = z.enum(['ABSENCE_REPORTED'])
export const notificationChannelSchema = z.enum(['IN_APP', 'DISCORD_DM'])

export const absenceCommandSchema = z.object({}).strict()

const attendanceEntrySchema = z.object({
  userId: z.uuid(),
  status: z.enum(['PRESENT', 'ABSENT', 'EXCUSED']),
}).strict()

export const attendanceCommandSchema = z.object({
  entries: z.array(attendanceEntrySchema).min(1).max(50),
}).strict().superRefine((command, context) => {
  if (new Set(command.entries.map((entry) => entry.userId)).size !== command.entries.length) {
    context.addIssue({ code: 'custom', message: 'Attendance entries must target unique users' })
  }
})

export const notificationQuerySchema = z.object({
  cursor: z.string().trim().min(1).max(128).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
}).strict()

export type AttendanceStatus = z.infer<typeof attendanceStatusSchema>
export type AttendanceEntry = z.infer<typeof attendanceEntrySchema>
export type AttendanceCommand = z.infer<typeof attendanceCommandSchema>
export type NotificationType = z.infer<typeof notificationTypeSchema>
export type NotificationChannel = z.infer<typeof notificationChannelSchema>
export type NotificationQuery = z.infer<typeof notificationQuerySchema>

export type NotificationView = {
  id: string
  type: NotificationType
  recipientId: string
  gameId: string
  sessionId: string
  actorId: string
  title: string
  body: string
  readAt: string | null
  createdAt: string
}

export type NotificationsPage = {
  items: NotificationView[]
  nextCursor: string | null
  unreadCount: number
}

export type AttendanceRecord = {
  id: string
  sessionId: string
  userId: string
  status: AttendanceStatus
  createdAt: Date
  updatedAt: Date
}

export type SessionContext = {
  sessionId: string
  gameId: string
  ownerId: string
  gameStatus: GameStatus
  sessionStatus: SessionStatus
  memberStatus: string
  memberDiscordId: string | null
  ownerDiscordId: string | null
}

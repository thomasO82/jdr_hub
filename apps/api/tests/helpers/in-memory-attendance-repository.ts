import type { AttendanceEntry, AttendanceRecord, GameStatus, SessionContext, SessionStatus } from '@jdr-hub/shared'
import type { AbsenceEvent, AttendanceRepository } from '../../src/modules/attendance/repository.js'
import type { NotificationRecord } from '../../src/modules/notifications/repository.js'

type SeedSession = Omit<SessionContext, 'memberStatus'> & {
  memberStatuses: Record<string, string>
}

type InMemoryAttendanceRepository = AttendanceRepository & {
  attendance: AttendanceRecord[]
  notifications: NotificationRecord[]
  deliveries: never[]
  sessionStatuses: Map<string, SessionStatus>
}

const id = (prefix: string, number: number) => `${prefix}-${number}`

export function createInMemoryAttendanceRepository(input: { sessions: SeedSession[] }): InMemoryAttendanceRepository {
  const sessions = new Map(input.sessions.map((session) => [session.sessionId, session]))
  const sessionStatuses = new Map(input.sessions.map((session) => [session.sessionId, session.sessionStatus]))
  const attendance: AttendanceRecord[] = []
  const notifications: NotificationRecord[] = []
  const deliveries: never[] = []
  let sequence = 1

  const context = (sessionId: string, userId: string): SessionContext | null => {
    const session = sessions.get(sessionId)
    if (!session) return null
    return {
      sessionId: session.sessionId,
      gameId: session.gameId,
      gameTitle: session.gameTitle,
      sessionStartsAt: session.sessionStartsAt,
      ownerId: session.ownerId,
      gameStatus: session.gameStatus,
      sessionStatus: sessionStatuses.get(sessionId) ?? session.sessionStatus,
      memberStatus: userId === session.ownerId ? 'ACTIVE' : session.memberStatuses[userId] ?? 'NONE',
    }
  }

  const absenceEvent = (session: SeedSession, userId: string, now: Date): AbsenceEvent => {
    const existing = attendance.find((entry) => entry.sessionId === session.sessionId && entry.userId === userId)
    if (existing) {
      const notification = notifications.find((entry) => entry.sessionId === session.sessionId && entry.actorId === userId)
      if (!notification) throw new Error('ATTENDANCE_CONFLICT')
      return { attendance: existing, notification }
    }
    if (attendance.some((entry) => entry.sessionId === session.sessionId && entry.userId === userId)) throw new Error('ATTENDANCE_CONFLICT')
    const attendanceRecord: AttendanceRecord = { id: id('attendance', sequence++), sessionId: session.sessionId, userId, status: 'EXCUSED', createdAt: now, updatedAt: now }
    const notification: NotificationRecord = { id: id('notification', sequence++), type: 'ABSENCE_REPORTED', recipientId: session.ownerId, gameId: session.gameId, sessionId: session.sessionId, actorId: userId, title: 'Absence signalée', body: 'Un joueur a signalé son absence pour une séance.', readAt: null, createdAt: now }
    attendance.push(attendanceRecord)
    notifications.push(notification)
    return { attendance: attendanceRecord, notification }
  }

  return {
    attendance,
    notifications,
    deliveries,
    sessionStatuses,
    async findSessionContext(sessionId, userId) { return context(sessionId, userId) },
    async reportAbsence({ sessionId, userId, now }) {
      const session = sessions.get(sessionId)
      const current = context(sessionId, userId)
      if (!session || !current) throw new Error('ATTENDANCE_NOT_FOUND')
      if (current.memberStatus !== 'ACTIVE') throw new Error('ATTENDANCE_FORBIDDEN')
      if (current.sessionStatus !== 'SCHEDULED' || !['OPEN', 'ACTIVE'].includes(current.gameStatus)) throw new Error('ATTENDANCE_CONFLICT')
      return absenceEvent(session, userId, now)
    },
    async finalizeAttendance({ sessionId, ownerId, entries, now }) {
      const session = sessions.get(sessionId)
      const current = context(sessionId, ownerId)
      if (!session || !current) throw new Error('ATTENDANCE_NOT_FOUND')
      if (current.ownerId !== ownerId) throw new Error('ATTENDANCE_FORBIDDEN')
      if (current.sessionStatus === 'COMPLETED') {
        const existing = entries.map((entry) => attendance.find((item) => item.sessionId === sessionId && item.userId === entry.userId))
        if (existing.some((record, index) => !record || record.status !== entries[index]?.status)) throw new Error('ATTENDANCE_CONFLICT')
        return existing as AttendanceRecord[]
      }
      if (!['SCHEDULED'].includes(current.sessionStatus) || !['OPEN', 'ACTIVE'].includes(current.gameStatus)) throw new Error('ATTENDANCE_CONFLICT')
      if (entries.some((entry) => session.memberStatuses[entry.userId] !== 'ACTIVE')) throw new Error('ATTENDANCE_FORBIDDEN')
      const records = entries.map((entry: AttendanceEntry) => {
        const existing = attendance.find((item) => item.sessionId === sessionId && item.userId === entry.userId)
        if (existing) {
          existing.status = entry.status
          existing.updatedAt = now
          return existing
        }
        const created: AttendanceRecord = { id: id('attendance', sequence++), sessionId, userId: entry.userId, status: entry.status, createdAt: now, updatedAt: now }
        attendance.push(created)
        return created
      })
      sessionStatuses.set(sessionId, 'COMPLETED')
      return records
    },
  }
}

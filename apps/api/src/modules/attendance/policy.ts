import type { AttendanceStatus, GameStatus, SessionStatus } from '@jdr-hub/shared'

const openGameStatuses = new Set<GameStatus>(['OPEN', 'ACTIVE'])

export function canReportAbsence(input: { sessionStatus: SessionStatus; gameStatus: GameStatus; memberStatus: string; attendanceStatus: AttendanceStatus | null }): boolean {
  return input.sessionStatus === 'SCHEDULED'
    && openGameStatuses.has(input.gameStatus)
    && input.memberStatus === 'ACTIVE'
    && (input.attendanceStatus === null || input.attendanceStatus === 'PENDING')
}

export function canValidateAttendance(input: { sessionStatus: SessionStatus; gameStatus: GameStatus; ownerId: string; actorId: string }): boolean {
  return input.sessionStatus === 'SCHEDULED'
    && openGameStatuses.has(input.gameStatus)
    && input.ownerId === input.actorId
}

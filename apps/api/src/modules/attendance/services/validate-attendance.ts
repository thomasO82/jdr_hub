import type { AttendanceCommand, AttendanceEntry, AttendanceRecord } from '@jdr-hub/shared'
import { canValidateAttendance } from '../policy.js'
import type { AttendanceRepository } from '../repository.js'

export async function validateAttendance(input: { sessionId: string; actorId: string; entries: AttendanceCommand['entries']; repository: AttendanceRepository; now?: () => Date }): Promise<AttendanceRecord[]> {
  const context = await input.repository.findSessionContext(input.sessionId, input.actorId)
  if (!context) throw new Error('ATTENDANCE_NOT_FOUND')
  if (!canValidateAttendance({ sessionStatus: context.sessionStatus, gameStatus: context.gameStatus, ownerId: context.ownerId, actorId: input.actorId })) {
    if (context.ownerId !== input.actorId) throw new Error('ATTENDANCE_FORBIDDEN')
    throw new Error('ATTENDANCE_CONFLICT')
  }
  return input.repository.finalizeAttendance({ sessionId: input.sessionId, ownerId: input.actorId, entries: input.entries as AttendanceEntry[], now: (input.now ?? (() => new Date()))() })
}

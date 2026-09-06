import { canReportAbsence } from '../policy.js'
import type { AbsenceEvent, AttendanceRepository } from '../repository.js'

export async function reportAbsence(input: { sessionId: string; userId: string; repository: AttendanceRepository; now?: () => Date }): Promise<AbsenceEvent> {
  const context = await input.repository.findSessionContext(input.sessionId, input.userId)
  if (!context) throw new Error('ATTENDANCE_NOT_FOUND')
  if (context.memberStatus !== 'ACTIVE') throw new Error('ATTENDANCE_FORBIDDEN')
  if (!canReportAbsence({ ...context, attendanceStatus: null })) throw new Error('ATTENDANCE_CONFLICT')
  return input.repository.reportAbsence({ sessionId: input.sessionId, userId: input.userId, now: (input.now ?? (() => new Date()))() })
}

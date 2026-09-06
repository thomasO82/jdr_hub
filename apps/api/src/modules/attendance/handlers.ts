import type { Context } from 'hono'
import { attendanceCommandSchema, absenceCommandSchema } from '@jdr-hub/shared'
import { readAccessToken } from '../auth/cookies.js'
import type { AuthConfig } from '../auth/config.js'
import type { AuthRepository } from '../auth/repository.js'
import { authenticateUser } from '../auth/services/authenticate-user.js'
import type { AttendanceRepository } from './repository.js'
import { reportAbsence } from './services/report-absence.js'
import { validateAttendance } from './services/validate-attendance.js'

export type AttendanceDependencies = {
  authConfig: AuthConfig
  authRepository: AuthRepository
  repository: AttendanceRepository
  now?: () => Date
}

export type AttendanceRouteEnv = { Variables: { requestId: string } }

function error(c: Context<AttendanceRouteEnv>, status: 400 | 401 | 403 | 404 | 409 | 429 | 500) {
  const message = status === 500 ? 'Une erreur interne est survenue. Réessayez plus tard.' : 'La demande de présence n’a pas pu être traitée.'
  return c.json({ data: null, error: { code: status === 500 ? 'INTERNAL_ERROR' : 'ATTENDANCE_ERROR', message }, meta: { requestId: c.get('requestId') } }, status)
}

function domainStatus(value: unknown): 400 | 403 | 404 | 409 | 500 {
  if (value instanceof Error && value.message === 'ATTENDANCE_FORBIDDEN') return 403
  if (value instanceof Error && value.message === 'ATTENDANCE_NOT_FOUND') return 404
  if (value instanceof Error && value.message === 'ATTENDANCE_CONFLICT') return 409
  return 500
}

const serializeAttendance = (record: { id: string; sessionId: string; userId: string; status: string; createdAt: Date; updatedAt: Date }) => ({
  id: record.id,
  sessionId: record.sessionId,
  userId: record.userId,
  status: record.status,
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
})

export function createAttendanceHandlers(dependencies: AttendanceDependencies) {
  const now = dependencies.now ?? (() => new Date())
  const limits = new Map<string, { startedAt: number; count: number }>()
  const allowed = (userId: string): boolean => {
    const currentTime = Date.now()
    const current = limits.get(userId)
    if (!current || currentTime - current.startedAt >= 60_000) {
      limits.set(userId, { startedAt: currentTime, count: 1 })
      return true
    }
    if (current.count >= 30) return false
    current.count += 1
    return true
  }
  async function currentUser(c: Context<AttendanceRouteEnv>) {
    const token = readAccessToken(c)
    return token ? authenticateUser({ config: dependencies.authConfig, repository: dependencies.authRepository, token, now: now() }) : null
  }
  const trustedOrigin = (c: Context<AttendanceRouteEnv>): boolean => c.req.header('origin') === dependencies.authConfig.appOrigin

  return {
    reportAbsence: async (c: Context<AttendanceRouteEnv>) => {
      const user = await currentUser(c)
      if (!user) return error(c, 401)
      if (!trustedOrigin(c)) return error(c, 403)
      if (!allowed(user.id)) return error(c, 429)
      const sessionId = c.req.param('id')
      const parsed = absenceCommandSchema.safeParse(await c.req.json().catch(() => null))
      if (!sessionId || !parsed.success) return error(c, 400)
      try {
        const result = await reportAbsence({ sessionId, userId: user.id, repository: dependencies.repository, now })
        return c.json({ data: { attendance: serializeAttendance(result.attendance) }, error: null, meta: { requestId: c.get('requestId') } }, 201)
      } catch (value) { return error(c, domainStatus(value)) }
    },
    validateAttendance: async (c: Context<AttendanceRouteEnv>) => {
      const user = await currentUser(c)
      if (!user) return error(c, 401)
      if (!trustedOrigin(c)) return error(c, 403)
      if (!allowed(user.id)) return error(c, 429)
      const sessionId = c.req.param('id')
      const parsed = attendanceCommandSchema.safeParse(await c.req.json().catch(() => null))
      if (!sessionId || !parsed.success) return error(c, 400)
      try {
        const records = await validateAttendance({ sessionId, actorId: user.id, entries: parsed.data.entries, repository: dependencies.repository, now })
        return c.json({ data: records.map(serializeAttendance), error: null, meta: { requestId: c.get('requestId') } })
      } catch (value) { return error(c, domainStatus(value)) }
    },
  }
}

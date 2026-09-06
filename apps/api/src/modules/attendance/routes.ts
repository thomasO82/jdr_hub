import type { Hono } from 'hono'
import { createAttendanceHandlers, type AttendanceDependencies, type AttendanceRouteEnv } from './handlers.js'

export function registerAttendanceRoutes(app: Hono<AttendanceRouteEnv>, dependencies: AttendanceDependencies): void {
  const handlers = createAttendanceHandlers(dependencies)
  app.post('/sessions/:id/absence', handlers.reportAbsence)
  app.post('/sessions/:id/attendance', handlers.validateAttendance)
}

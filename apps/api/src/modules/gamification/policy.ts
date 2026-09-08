import { XP_REWARDS } from '@jdr-hub/shared'

export function sessionAttendedIdempotencyKey(sessionId: string, userId: string): string {
  return `session-attended:${sessionId}:${userId}`
}

export function sessionAttendedXp(): number {
  return XP_REWARDS.SESSION_ATTENDED
}

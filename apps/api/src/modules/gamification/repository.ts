import { and, desc, eq, lt, or, sum } from 'drizzle-orm'
import { authSchema, gamificationSchema, type DatabaseHandle, type DatabaseTransaction, type createDatabase } from '@jdr-hub/database'
import type { XpEvent, XpSummary } from '@jdr-hub/shared'
import { createXpSummary } from '@jdr-hub/shared'
import { sessionAttendedIdempotencyKey, sessionAttendedXp } from './policy.js'

type Database = ReturnType<typeof createDatabase>['db']
export type XpCursor = { createdAt: string; id: string }

export type GamificationRepository = {
  awardSessionXp(input: { tx?: DatabaseTransaction; sessionId: string; presentUserIds: string[]; now: Date }): Promise<void>
  getSummary(userId: string): Promise<XpSummary>
  listEvents(input: { userId: string; cursor: XpCursor | null; limit: number }): Promise<{ items: XpEvent[]; nextCursor: XpCursor | null }>
}

type XpEventRow = {
  id: string
  sessionId: string | null
  amount: number
  reason: string
  createdAt: Date
}

function toXpEvent(row: XpEventRow): XpEvent {
  return { id: row.id, sessionId: row.sessionId, amount: row.amount, reason: row.reason as XpEvent['reason'], createdAt: row.createdAt.toISOString() }
}

export function createPostgresGamificationRepository(database: Database): GamificationRepository {
  const { users } = authSchema
  const { xpEvents } = gamificationSchema

  return {
    async awardSessionXp({ tx, sessionId, presentUserIds, now }) {
      const executor = (tx ?? database) as DatabaseHandle
      for (const userId of new Set(presentUserIds)) {
        await executor.insert(xpEvents).values({ userId, sessionId, amount: sessionAttendedXp(), reason: 'SESSION_ATTENDED', idempotencyKey: sessionAttendedIdempotencyKey(sessionId, userId), createdAt: now }).onConflictDoNothing({ target: xpEvents.idempotencyKey })
        const [total] = await executor.select({ total: sum(xpEvents.amount) }).from(xpEvents).where(eq(xpEvents.userId, userId))
        const summary = createXpSummary(Number(total?.total ?? 0))
        await executor.update(users).set({ xp: summary.totalXp, level: summary.level, updatedAt: now }).where(eq(users.id, userId))
      }
    },
    async getSummary(userId) {
      const [user] = await database.select({ xp: users.xp }).from(users).where(eq(users.id, userId)).limit(1)
      if (!user) throw new Error('XP_USER_NOT_FOUND')
      return createXpSummary(user.xp)
    },
    async listEvents({ userId, cursor, limit }) {
      const cursorDate = cursor ? new Date(cursor.createdAt) : null
      const cursorId = cursor?.id
      const rows = await database.select({ id: xpEvents.id, sessionId: xpEvents.sessionId, amount: xpEvents.amount, reason: xpEvents.reason, createdAt: xpEvents.createdAt })
        .from(xpEvents)
        .where(and(eq(xpEvents.userId, userId), cursorDate && cursorId ? or(lt(xpEvents.createdAt, cursorDate), and(eq(xpEvents.createdAt, cursorDate), lt(xpEvents.id, cursorId))) : undefined))
        .orderBy(desc(xpEvents.createdAt), desc(xpEvents.id))
        .limit(limit + 1)
      const hasNext = rows.length > limit
      const page = rows.slice(0, limit)
      const last = page.at(-1)
      return { items: page.map(toXpEvent), nextCursor: hasNext && last ? { createdAt: last.createdAt.toISOString(), id: last.id } : null }
    },
  }
}

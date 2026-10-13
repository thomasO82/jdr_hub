import { createXpSummary, type XpEvent, type XpSummary } from '@jdr-hub/shared'

export type InMemoryXpEvent = XpEvent & { userId: string; idempotencyKey: string }

export function createInMemoryGamificationRepository(input: { events?: InMemoryXpEvent[]; users?: string[] } = {}) {
  const events = [...(input.events ?? [])]
  const users = new Set(input.users ?? ['user-1', 'user-2'])

  return {
    events,
    async awardSessionXp({ sessionId, presentUserIds, now }: { sessionId: string; presentUserIds: string[]; now: Date }) {
      for (const userId of presentUserIds) {
        users.add(userId)
        const idempotencyKey = `session-attended:${sessionId}:${userId}`
        if (events.some((event) => event.idempotencyKey === idempotencyKey)) continue
        events.push({ id: `event-${events.length + 1}`, userId, sessionId, amount: 100, reason: 'SESSION_ATTENDED', createdAt: now.toISOString(), idempotencyKey })
      }
    },
    async getSummary(userId: string): Promise<XpSummary> {
      return createXpSummary(events.filter((event) => event.userId === userId).reduce((total, event) => total + event.amount, 0))
    },
    async listEvents({ userId, limit }: { userId: string; cursor: { createdAt: string; id: string } | null; limit: number }) {
      const items = events.filter((event) => event.userId === userId).sort((left, right) => right.createdAt.localeCompare(left.createdAt) || right.id.localeCompare(left.id)).slice(0, limit)
      return { items, nextCursor: null }
    },
  }
}

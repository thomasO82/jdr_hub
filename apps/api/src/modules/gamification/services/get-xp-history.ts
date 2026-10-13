import { xpHistoryQuerySchema, type XpHistoryPage } from '@jdr-hub/shared'
import type { GamificationRepository, XpCursor } from '../repository.js'

function decodeCursor(value: string | undefined): XpCursor | null {
  if (!value) return null
  try {
    const decoded = Buffer.from(value, 'base64url').toString('utf8')
    const cursor = JSON.parse(decoded) as unknown
    if (!cursor || typeof cursor !== 'object' || typeof (cursor as { createdAt?: unknown }).createdAt !== 'string' || typeof (cursor as { id?: unknown }).id !== 'string') throw new Error('INVALID_CURSOR')
    return { createdAt: (cursor as { createdAt: string }).createdAt, id: (cursor as { id: string }).id }
  } catch {
    throw new Error('INVALID_CURSOR')
  }
}
function encodeCursor(cursor: XpCursor | null): string | null {
  return cursor ? Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url') : null
}

export async function getXpHistory(input: { userId: string; query: unknown; repository: GamificationRepository }): Promise<XpHistoryPage> {
  const query = xpHistoryQuerySchema.parse(input.query)
  const [summary, events] = await Promise.all([
    input.repository.getSummary(input.userId),
    input.repository.listEvents({ userId: input.userId, cursor: decodeCursor(query.cursor), limit: query.limit }),
  ])
  return { summary, items: events.items, nextCursor: encodeCursor(events.nextCursor) }
}

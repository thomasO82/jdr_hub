import { describe, expect, it } from 'vitest'
import { awardSessionXp } from '../../../src/modules/gamification/services/award-session-xp.js'
import { getXpHistory } from '../../../src/modules/gamification/services/get-xp-history.js'
import { createInMemoryGamificationRepository } from '../../helpers/in-memory-gamification-repository.js'

const now = new Date('2026-09-08T12:00:00.000Z')

describe('gamification services', () => {
  it('awards one event per present participant and excludes non-present users', async () => {
    const repository = createInMemoryGamificationRepository()

    await awardSessionXp({ repository, sessionId: 'session-1', presentUserIds: ['user-1'], now })

    expect(repository.events).toMatchObject([{ userId: 'user-1', amount: 100, reason: 'SESSION_ATTENDED' }])
    expect(repository.events).not.toContainEqual(expect.objectContaining({ userId: 'user-2' }))
  })

  it('is idempotent for the same session and user', async () => {
    const repository = createInMemoryGamificationRepository()

    await awardSessionXp({ repository, sessionId: 'session-1', presentUserIds: ['user-1'], now })
    await awardSessionXp({ repository, sessionId: 'session-1', presentUserIds: ['user-1'], now })

    expect(repository.events).toHaveLength(1)
  })

  it('paginates only the authenticated user history', async () => {
    const repository = createInMemoryGamificationRepository({ events: [{ id: 'event-1', userId: 'user-1', sessionId: 'session-1', amount: 100, reason: 'SESSION_ATTENDED', createdAt: now.toISOString(), idempotencyKey: 'session-attended:session-1:user-1' }] })

    const page = await getXpHistory({ userId: 'user-1', query: { limit: 20 }, repository })

    expect(page.items.every((event) => event.sessionId === 'session-1')).toBe(true)
    expect(page.items).not.toContainEqual(expect.objectContaining({ userId: 'user-2' }))
    expect(page.summary.totalXp).toBe(100)
  })
})

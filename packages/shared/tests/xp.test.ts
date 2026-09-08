import { describe, expect, it } from 'vitest'
import {
  calculateLevel,
  calculateProgress,
  xpEventSchema,
  xpHistoryQuerySchema,
  xpReasonSchema,
} from '../src/xp.js'

describe('XP shared contracts and rules', () => {
  it('calculates the highest reached level and bounded progress', () => {
    expect(calculateLevel(0)).toBe(1)
    expect(calculateLevel(250)).toBe(2)
    expect(calculateLevel(1_750)).toBe(5)
    expect(calculateProgress(300)).toEqual({ currentLevelXp: 250, nextLevelXp: 600, progressPercent: 14 })
  })

  it('rejects unknown reasons, non-positive amounts and oversized history limits', () => {
    expect(xpReasonSchema.safeParse('MANUAL_BONUS').success).toBe(false)
    expect(xpEventSchema.safeParse({ id: 'x', sessionId: null, amount: 0, reason: 'SESSION_ATTENDED', createdAt: new Date().toISOString() }).success).toBe(false)
    expect(xpHistoryQuerySchema.safeParse({ limit: 51 }).success).toBe(false)
  })

  it('defaults history pagination and rejects client identity fields', () => {
    expect(xpHistoryQuerySchema.parse({})).toEqual({ limit: 20 })
    expect(xpHistoryQuerySchema.safeParse({ userId: 'forged' }).success).toBe(false)
  })
})

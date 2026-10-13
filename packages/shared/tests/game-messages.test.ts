import { describe, expect, it } from 'vitest'
import {
  gameMessageCommandSchema,
  gameMessageQuerySchema,
} from '../src/game-messages.js'

describe('game message contracts', () => {
  it('trims valid text and rejects empty, oversized, and unknown payloads', () => {
    expect(gameMessageCommandSchema.parse({ content: '  Salut la table  ' })).toEqual({
      content: 'Salut la table',
    })
    expect(
      gameMessageCommandSchema.safeParse({ content: 'a'.repeat(2_001) }).success,
    ).toBe(false)
    expect(gameMessageCommandSchema.safeParse({ content: '   ' }).success).toBe(false)
    expect(
      gameMessageCommandSchema.safeParse({ content: 'ok', authorId: 'forged' }).success,
    ).toBe(false)
  })

  it('bounds message pagination and rejects a forged query field', () => {
    expect(gameMessageQuerySchema.parse({})).toEqual({ limit: 20 })
    expect(
      gameMessageQuerySchema.parse({ cursor: 'opaque-cursor', limit: 50 }),
    ).toEqual({ cursor: 'opaque-cursor', limit: 50 })
    expect(gameMessageQuerySchema.safeParse({ limit: 51 }).success).toBe(false)
    expect(gameMessageQuerySchema.safeParse({ userId: 'forged' }).success).toBe(false)
  })
})

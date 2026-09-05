import { describe, expect, it } from 'vitest'
import { publicGamesQuerySchema } from '../src/public-games.js'

describe('public games contracts', () => {
  it('accepts bounded public filters and rejects unknown keys', () => {
    expect(publicGamesQuerySchema.parse({ q: 'crypte', tagSlugs: ['horreur'], page: 1 }).page).toBe(1)
    expect(publicGamesQuerySchema.safeParse({ unknown: 'x' }).success).toBe(false)
    expect(publicGamesQuerySchema.safeParse({ pageSize: 51 }).success).toBe(false)
  })
})

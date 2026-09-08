import { describe, expect, it } from 'vitest'
import { publicGamesQuerySchema } from '../src/public-games.js'

describe('public games contracts', () => {
  it('accepts bounded public filters and rejects unknown keys', () => {
    expect(publicGamesQuerySchema.parse({ q: 'crypte', tagSlugs: ['horreur'], page: 1 }).page).toBe(1)
    expect(publicGamesQuerySchema.safeParse({ unknown: 'x' }).success).toBe(false)
    expect(publicGamesQuerySchema.safeParse({ pageSize: 51 }).success).toBe(false)
  })

  it('accepts all catalogue filters with normalized dates and places', () => {
    expect(publicGamesQuerySchema.parse({
      type: 'ONE_SHOT',
      format: 'TABLE',
      system: ' Dungeons & Dragons 5e ',
      dateFrom: '2026-10-01',
      dateTo: '2026-10-31',
      minAvailablePlaces: '2',
    })).toMatchObject({
      type: 'ONE_SHOT',
      format: 'TABLE',
      system: 'Dungeons & Dragons 5e',
      dateFrom: '2026-10-01',
      dateTo: '2026-10-31',
      minAvailablePlaces: 2,
    })
  })

  it('rejects an inverted date range and an out-of-range places filter', () => {
    expect(publicGamesQuerySchema.safeParse({ dateFrom: '2026-11-01', dateTo: '2026-10-01' }).success).toBe(false)
    expect(publicGamesQuerySchema.safeParse({ minAvailablePlaces: 13 }).success).toBe(false)
  })
})

import { describe, expect, it } from 'vitest'
import { buildCatalogueQuery, type CatalogueSearchParams } from '../features/games/catalogue-filter-query'

describe('catalogue filter query', () => {
  it('maps every form filter to the shared public games query', () => {
    const searchParams: CatalogueSearchParams = {
      q: 'crypte',
      gmName: 'MJ',
      tagSlugs: ['horror', 'online'],
      type: 'CAMPAIGN',
      format: 'TABLE',
      system: 'Dungeons & Dragons 5e',
      dateFrom: '2026-10-01',
      dateTo: '2026-10-31',
      minAvailablePlaces: '2',
    }

    expect(buildCatalogueQuery(searchParams)).toEqual({
      q: 'crypte',
      gmName: 'MJ',
      tagSlugs: ['horror', 'online'],
      type: 'CAMPAIGN',
      format: 'TABLE',
      system: 'Dungeons & Dragons 5e',
      dateFrom: '2026-10-01',
      dateTo: '2026-10-31',
      minAvailablePlaces: 2,
    })
  })
})

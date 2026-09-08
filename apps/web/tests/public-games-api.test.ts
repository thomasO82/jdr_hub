import { describe, expect, it, vi } from 'vitest'
import { createPublicGamesApi } from '../lib/public-games-api'

describe('public games API client', () => {
  it('calls the public endpoint and keeps filters in the query string', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ data: { items: [], page: 1, pageSize: 20 } }), { status: 200 }))
    const api = createPublicGamesApi({ baseUrl: 'http://api.test', fetcher })

    await api.list({ q: 'crypte', tagSlugs: ['horror', 'online'], page: 1, pageSize: 20 })

    expect(fetcher).toHaveBeenCalledWith('http://api.test/public/games?q=crypte&tagSlugs=horror&tagSlugs=online&page=1&pageSize=20', expect.any(Object))
  })

  it('serializes every catalogue filter in the query string', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ data: { items: [], page: 1, pageSize: 20 } }), { status: 200 }))
    const api = createPublicGamesApi({ baseUrl: 'http://api.test', fetcher })

    await api.list({
      type: 'CAMPAIGN',
      format: 'TABLE',
      system: 'Dungeons & Dragons 5e',
      dateFrom: '2026-10-01',
      dateTo: '2026-10-31',
      minAvailablePlaces: 2,
    })

    expect(fetcher).toHaveBeenCalledWith(
      'http://api.test/public/games?type=CAMPAIGN&format=TABLE&system=Dungeons+%26+Dragons+5e&dateFrom=2026-10-01&dateTo=2026-10-31&minAvailablePlaces=2',
      expect.any(Object),
    )
  })
})

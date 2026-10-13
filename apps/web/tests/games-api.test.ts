import { describe, expect, it, vi } from 'vitest'
import { createGamesApi } from '../features/games/games-api'

describe('games API client', () => {
  it('loads the public catalogue from the API envelope', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      data: { items: [{ slug: 'crypte', title: 'La Crypte' }], page: 1, pageSize: 12 },
      error: null,
    }), { status: 200 }))

    const api = createGamesApi({ baseUrl: 'http://api.test', fetcher })
    const result = await api.list('q=crypte')

    expect(fetcher).toHaveBeenCalledWith('http://api.test/games?q=crypte', expect.any(Object))
    expect(result?.items[0]?.title).toBe('La Crypte')
  })

  it('returns no game when the API responds with an error', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 404 }))
    const api = createGamesApi({ baseUrl: 'http://api.test', fetcher })

    await expect(api.detail('missing')).resolves.toBeNull()
  })

  it('loads active tags for the catalogue filters', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      data: [{ name: 'Horreur', slug: 'horror' }],
      error: null,
    }), { status: 200 }))
    const api = createGamesApi({ baseUrl: 'http://api.test', fetcher })

    await expect(api.tags()).resolves.toEqual([{ name: 'Horreur', slug: 'horror' }])
  })
})

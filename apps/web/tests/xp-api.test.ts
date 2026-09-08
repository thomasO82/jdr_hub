import { describe, expect, it, vi } from 'vitest'
import { createXpApi } from '../lib/xp-api.js'

const page = {
  summary: { totalXp: 300, level: 2, currentLevelXp: 250, nextLevelXp: 600, progressPercent: 14 },
  items: [{ id: 'event-1', sessionId: 'session-1', amount: 100, reason: 'SESSION_ATTENDED', createdAt: '2026-09-08T12:00:00.000Z' }],
  nextCursor: 'next-page',
} as const

describe('XP API client', () => {
  it('loads the private history with bounded query parameters and credentials', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ data: page, error: null }), { status: 200 }))
    const api = createXpApi({ baseUrl: 'http://api.test/api', fetcher })

    await expect(api.getHistory({ cursor: 'opaque cursor', limit: 20 })).resolves.toEqual(page)
    expect(fetcher).toHaveBeenCalledWith('http://api.test/api/profile/xp?cursor=opaque+cursor&limit=20', expect.objectContaining({ credentials: 'include', cache: 'no-store' }))
  })

  it('turns transport and API errors into a safe null result', async () => {
    const failed = createXpApi({ fetcher: vi.fn<typeof fetch>().mockResolvedValue(new Response('{}', { status: 500 })) })
    await expect(failed.getHistory()).resolves.toBeNull()

    const broken = createXpApi({ fetcher: vi.fn<typeof fetch>().mockRejectedValue(new Error('raw backend failure')) })
    await expect(broken.getHistory()).resolves.toBeNull()
  })
})

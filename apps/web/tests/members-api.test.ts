import { describe, expect, it, vi } from 'vitest'
import { createMembersApi } from '../lib/members-api.js'

describe('members API client', () => {
  it('loads and removes roster members with encoded identifiers and trusted origin', async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
    const api = createMembersApi({ baseUrl: 'http://api.test/api', origin: 'http://app.test', fetcher })
    await expect(api.listForGame('game/1')).resolves.toEqual([])
    await expect(api.remove('game/1', 'user/2')).resolves.toBe(true)
    expect(fetcher).toHaveBeenNthCalledWith(2, 'http://api.test/api/games/game%2F1/members/user%2F2', expect.objectContaining({ method: 'DELETE', credentials: 'include', headers: expect.objectContaining({ origin: 'http://app.test' }) }))
  })

  it('returns a safe failure for a non-success response', async () => {
    const api = createMembersApi({ fetcher: vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 403 })) })
    await expect(api.remove('game-1', 'user-1')).resolves.toBe(false)
  })
})

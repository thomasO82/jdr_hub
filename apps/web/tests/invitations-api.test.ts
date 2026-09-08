import { describe, expect, it, vi } from 'vitest'
import { createInvitationsApi } from '../lib/invitations-api.js'

describe('invitations API client', () => {
  it('uses encoded paths, credentials and the trusted origin for mutations', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ data: { items: [] } }), { status: 200 }))
    const api = createInvitationsApi({ baseUrl: 'http://api.test/api', origin: 'http://app.test', fetcher })
    await api.listForGame('game/1')
    await api.create('game/1', 'user/2')
    await api.decide('invitation/3', 'REJECTED')
    expect(fetcher).toHaveBeenNthCalledWith(1, 'http://api.test/api/games/game%2F1/invitations', expect.objectContaining({ credentials: 'include' }))
    expect(fetcher).toHaveBeenNthCalledWith(2, 'http://api.test/api/games/game%2F1/invitations', expect.objectContaining({ headers: expect.objectContaining({ origin: 'http://app.test' }), body: JSON.stringify({ inviteeId: 'user/2' }) }))
    expect(fetcher).toHaveBeenNthCalledWith(3, 'http://api.test/api/invitations/invitation%2F3', expect.objectContaining({ headers: expect.objectContaining({ origin: 'http://app.test' }) }))
  })

  it('does not expose raw API errors to the UI', async () => {
    const api = createInvitationsApi({ fetcher: vi.fn<typeof fetch>().mockResolvedValue(new Response('database password', { status: 500 })) })
    await expect(api.listMine()).resolves.toBeNull()
  })
})

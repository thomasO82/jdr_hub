import { describe, expect, it } from 'vitest'
import { createSchedulingApi } from '../lib/scheduling-api.js'

describe('scheduling api client', () => {
  it('sends proposal and vote commands with credentials', async () => {
    const calls: Array<{ url: string; method: string }> = []
    const api = createSchedulingApi({ baseUrl: '/api', fetcher: async (url, init) => { calls.push({ url: String(url), method: init?.method ?? 'GET' }); return new Response(JSON.stringify({ data: [] }), { status: 200 }) } })
    await api.createProposals('game-1', [{ startsAt: '2026-10-20T18:00:00.000Z', endsAt: '2026-10-20T21:00:00.000Z' }])
    await api.vote('proposal-1', 'YES')
    expect(calls).toEqual([{ url: '/api/games/game-1/proposals', method: 'POST' }, { url: '/api/proposals/proposal-1/votes', method: 'POST' }])
  })

  it('loads session history and sends strict edit and cancel commands with credentials', async () => {
    const calls: Array<{ url: string; method: string; body: string | null; credentials: RequestCredentials | undefined }> = []
    const api = createSchedulingApi({ baseUrl: '/api', fetcher: async (url, init) => { calls.push({ url: String(url), method: init?.method ?? 'GET', body: String(init?.body ?? '') || null, credentials: init?.credentials }); return new Response(JSON.stringify({ data: [] }), { status: 200 }) } })
    await api.listGameSessions('game/1')
    await api.updateSession('game/1', 'session/2', { startsAt: '2026-10-20T18:00:00.000Z', endsAt: '2026-10-20T21:00:00.000Z' })
    await api.cancelSession('game/1', 'session/2')

    expect(calls).toEqual([
      { url: '/api/games/game%2F1/sessions', method: 'GET', body: null, credentials: 'include' },
      { url: '/api/games/game%2F1/sessions/session%2F2', method: 'PATCH', body: JSON.stringify({ startsAt: '2026-10-20T18:00:00.000Z', endsAt: '2026-10-20T21:00:00.000Z' }), credentials: 'include' },
      { url: '/api/games/game%2F1/sessions/session%2F2', method: 'PATCH', body: JSON.stringify({ status: 'CANCELLED' }), credentials: 'include' },
    ])
  })

  it('returns null when session-management requests fail', async () => {
    const api = createSchedulingApi({ fetcher: async () => new Response(JSON.stringify({ data: null }), { status: 403 }) })
    await expect(api.listGameSessions('game-1')).resolves.toBeNull()
    await expect(api.updateSession('game-1', 'session-1', { startsAt: '2026-10-20T18:00:00.000Z', endsAt: '2026-10-20T21:00:00.000Z' })).resolves.toBeNull()
    await expect(api.cancelSession('game-1', 'session-1')).resolves.toBeNull()
  })
})

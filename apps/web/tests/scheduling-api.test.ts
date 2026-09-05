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
})

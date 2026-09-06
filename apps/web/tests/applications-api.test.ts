import { describe, expect, it } from 'vitest'
import { createApplicationsApi } from '../lib/applications-api'

describe('applications API client', () => {
  it('uses the application routes and sends only the user message', async () => {
    const requests: Array<{ url: string; init?: RequestInit }> = []
    const api = createApplicationsApi({ baseUrl: 'http://api.test', fetcher: async (input, init) => {
      requests.push(init ? { url: String(input), init } : { url: String(input) })
      return new Response(JSON.stringify({ data: { id: 'application-1', status: 'PENDING' }, error: null }), { status: 201, headers: { 'content-type': 'application/json' } })
    } })
    await api.submit('game-1', 'Disponible le jeudi.')
    await api.getMineForGame('game-1')
    await api.listMine()
    await api.listForGame('game-1')
    await api.decide('application-1', 'ACCEPTED')
    expect(requests.map((request) => request.url)).toEqual([
      'http://api.test/games/game-1/applications',
      'http://api.test/games/game-1/application',
      'http://api.test/applications',
      'http://api.test/games/game-1/applications',
      'http://api.test/applications/application-1',
    ])
    expect(requests[0]?.init?.body).toBe(JSON.stringify({ message: 'Disponible le jeudi.' }))
  })
})

import { describe, expect, it } from 'vitest'
import { createPlayersApi } from '../lib/players-api'

describe('players API client', () => {
  it('encodes bounded filters and uses credentialed requests', async () => {
    const requests: Array<{ url: string; init?: RequestInit }> = []
    const api = createPlayersApi({ baseUrl: 'http://api.test', fetcher: async (input, init) => {
      requests.push(init ? { url: String(input), init } : { url: String(input) })
      return new Response(JSON.stringify({ data: { items: [], page: 1, pageSize: 20 }, error: null }), { status: 200 })
    } })
    await api.search({ q: 'Léo & co', system: 'D&D 5e', dayOfWeek: 2, startMinute: 1080, endMinute: 1320, page: 1, pageSize: 20 })
    expect(requests[0]?.url).toBe('http://api.test/players?q=L%C3%A9o%20%26%20co&system=D%26D%205e&dayOfWeek=2&startMinute=1080&endMinute=1320&page=1&pageSize=20')
    expect(requests[0]?.init?.credentials).toBe('include')
  })
})

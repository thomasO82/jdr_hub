import { describe, expect, it } from 'vitest'
import { createAvailabilityApi } from '../lib/availability-api'

describe('availability API client', () => {
  it('uses credentialed availability routes and encodes player filters', async () => {
    const requests: Array<{ url: string; init?: RequestInit }> = []
    const api = createAvailabilityApi({ baseUrl: 'http://api.test', fetcher: async (input, init) => {
      requests.push(init ? { url: String(input), init } : { url: String(input) })
      return new Response(JSON.stringify({ data: { userId: 'u1', rules: [] }, error: null }), { status: 200, headers: { 'content-type': 'application/json' } })
    } })
    await api.get()
    await api.replace({ timezone: 'Europe/Paris', rules: [], exceptions: [], preferences: { availabilityPublic: false, invitationNotifications: true, experienceLevel: null }, preferredSystems: [] })
    await api.players({ q: 'Arkanis & co', system: 'D&D 5e', page: 2, pageSize: 10 })
    expect(requests.map((request) => request.url)).toEqual([
      'http://api.test/availability',
      'http://api.test/availability',
      'http://api.test/players?q=Arkanis%20%26%20co&system=D%26D%205e&page=2&pageSize=10',
    ])
    expect(requests[1]?.init?.credentials).toBe('include')
    expect(requests[1]?.init?.method).toBe('PUT')
  })
})

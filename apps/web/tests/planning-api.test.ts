import { describe, expect, it } from 'vitest'
import { createPlanningApi } from '../lib/planning-api.js'

describe('planning api client', () => {
  it('requests a bounded date range with credentials', async () => {
    let called: { url: string; init: RequestInit | undefined } | undefined
    const api = createPlanningApi({ baseUrl: 'http://api.test/', fetcher: async (url, init) => { called = { url: String(url), init }; return new Response(JSON.stringify({ data: { items: [], from: null, to: null } }), { status: 200 }) } })
    await api.get({ from: '2026-10-01T00:00:00.000Z', to: '2026-10-31T23:59:59.000Z' })
    expect(called?.url).toContain('/planning?from=')
    expect(called?.init?.credentials).toBe('include')
  })
})

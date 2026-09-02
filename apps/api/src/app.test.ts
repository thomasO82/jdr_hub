import { describe, expect, it } from 'vitest'
import { createApiApp } from './app'

describe('GET /health', () => {
  it('returns the stable health envelope and a request id', async () => {
    const response = await createApiApp().request('/health')
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      data: { status: 'ok' },
      error: null,
      meta: { requestId: expect.any(String) },
    })
  })
})

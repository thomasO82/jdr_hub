import { describe, expect, it } from 'vitest'
import { createApiApp } from './app.js'

describe('GET /health', () => {
  it('returns the stable health envelope and a request id', async () => {
    const response = await createApiApp().request('/health')
    const responseBody = await response.json()

    expect(response.status).toBe(200)
    expect(responseBody).toEqual({
      data: { status: 'ok' },
      error: null,
      meta: { requestId: expect.any(String) },
    })

    const secondResponse = await createApiApp().request('/health')
    expect(secondResponse.headers.get('content-type')).toContain(
      'application/json',
    )
    expect((await secondResponse.json()).meta.requestId).not.toBe(
      responseBody.meta.requestId,
    )
  })

  it('includes a request id in the not-found envelope', async () => {
    const response = await createApiApp().request('/missing')

    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({
      data: null,
      error: { code: 'NOT_FOUND', message: 'Not found' },
      meta: { requestId: expect.any(String) },
    })
  })
})

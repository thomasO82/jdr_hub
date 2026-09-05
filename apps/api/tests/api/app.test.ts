import { describe, expect, it } from 'vitest'
import { createApiApp } from '../../src/app.js'

describe('GET /health', () => {
  it('rejects requests larger than the API body limit', async () => {
    const response = await createApiApp().request('/health', {
      method: 'POST',
      headers: { 'content-length': '1048577' },
    })

    expect(response.status).toBe(413)
    expect(await response.json()).toEqual({
      data: null,
      error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body too large' },
      meta: { requestId: expect.any(String) },
    })
  })

  it('rejects malformed content length headers', async () => {
    const response = await createApiApp().request('/health', {
      method: 'POST',
      headers: { 'content-length': 'not-a-number' },
    })

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({
      data: null,
      error: { code: 'INVALID_CONTENT_LENGTH', message: 'Invalid content length' },
      meta: { requestId: expect.any(String) },
    })
  })

  it('sets security headers on API responses', async () => {
    const response = await createApiApp().request('/health')

    expect(response.headers.get('x-content-type-options')).toBe('nosniff')
    expect(response.headers.get('x-frame-options')).toBe('DENY')
    expect(response.headers.get('referrer-policy')).toBe(
      'strict-origin-when-cross-origin',
    )
    expect(response.headers.get('content-security-policy')).toContain(
      "default-src 'self'",
    )
  })

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

  it('returns a sanitized internal-error envelope with a request id', async () => {
    const app = createApiApp()
    app.get('/test-error', () => {
      throw new Error('test-only failure')
    })

    const response = await app.request('/test-error')

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({
      data: null,
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
      meta: { requestId: expect.any(String) },
    })
  })
})

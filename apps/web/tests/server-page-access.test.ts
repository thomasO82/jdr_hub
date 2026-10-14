import { afterEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, type NextResponse } from 'next/server'

type AccessModule = {
  checkServerPageAccess?: (
    pathname: string,
    accessCookie: string | undefined,
    fetcher?: typeof fetch,
  ) => Promise<'public' | 'authenticated' | 'login-required' | 'unavailable'>
  shouldBypassPageGuard?: (pathname: string) => boolean
}

type ProxyModule = {
  proxy?: (request: NextRequest) => Promise<NextResponse | Response>
}

async function loadAccessModule(): Promise<AccessModule | null> {
  try {
    const modulePath = '../lib/server-page-access'
    return await import(modulePath) as AccessModule
  } catch {
    return null
  }
}

async function loadProxyModule(): Promise<ProxyModule | null> {
  try {
    const modulePath = '../proxy'
    return await import(modulePath) as ProxyModule
  } catch {
    return null
  }
}

async function check(
  pathname: string,
  cookie?: string,
  fetcher?: typeof fetch,
): Promise<string> {
  const access = await loadAccessModule()
  return access?.checkServerPageAccess
    ? access.checkServerPageAccess(pathname, cookie, fetcher)
    : 'not-implemented'
}

describe('server page access', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('serves only the presentation and connection page without a session', async () => {
    expect(await check('/')).toBe('public')
    expect(await check('/connexion')).toBe('public')
    expect(await check('/connexion/')).toBe('public')
    expect(await check('/parties')).toBe('login-required')
    expect(await check('/parties/la-crypte')).toBe('login-required')
  })

  it('accepts only a live session confirmed by the API', async () => {
    const access = await loadAccessModule()
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 200 }))
    vi.stubEnv('API_INTERNAL_URL', 'https://api.example.test')

    const result = access?.checkServerPageAccess
      ? await access.checkServerPageAccess('/parties/la-crypte', 'valid-access-token', fetcher)
      : 'not-implemented'

    expect(result).toBe('authenticated')
    expect(fetcher).toHaveBeenCalledOnce()
    const [url, init] = fetcher.mock.calls[0]!
    expect(String(url)).toBe('https://api.example.test/me')
    expect(new Headers(init?.headers).get('cookie')).toBe('jdr_hub_access=valid-access-token')
    expect(new Headers(init?.headers).get('cookie')).not.toContain('refresh')
    expect(init?.cache).toBe('no-store')
  })

  it('does not call the API when a private page has no access cookie', async () => {
    const access = await loadAccessModule()
    const fetcher = vi.fn<typeof fetch>()

    const result = access?.checkServerPageAccess
      ? await access.checkServerPageAccess('/dashboard', undefined, fetcher)
      : 'not-implemented'

    expect(result).toBe('login-required')
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('treats a revoked session as signed out and an API failure as unavailable', async () => {
    const access = await loadAccessModule()
    const unauthorized = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 401 }))
    const unavailable = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 503 }))
    const rejected = vi.fn<typeof fetch>().mockRejectedValue(new Error('network failure'))
    const resolve = access?.checkServerPageAccess

    expect(resolve ? await resolve('/planning', 'revoked-token', unauthorized) : 'not-implemented').toBe('login-required')
    expect(resolve ? await resolve('/planning', 'access-token', unavailable) : 'not-implemented').toBe('unavailable')
    expect(resolve ? await resolve('/planning', 'access-token', rejected) : 'not-implemented').toBe('unavailable')
  })

  it('bypasses API and known static resources without treating private routes with dots as assets', async () => {
    const access = await loadAccessModule()
    const bypass = access?.shouldBypassPageGuard

    expect(bypass?.('/api/me')).toBe(true)
    expect(bypass?.('/_next/static/chunks/app.js')).toBe(true)
    expect(bypass?.('/branding/logo.svg')).toBe(true)
    expect(bypass?.('/robots.txt')).toBe(true)
    expect(bypass?.('/sitemap.xml')).toBe(true)
    expect(bypass?.('/parties/private.game')).toBe(false)
  })

  it('redirects anonymous private page requests before rendering', async () => {
    const proxy = (await loadProxyModule())?.proxy
    const response = proxy ? await proxy(new NextRequest('https://jdr.example.test/parties')) : null

    expect(response?.status).toBe(307)
    expect(response?.headers.get('location')).toBe('https://jdr.example.test/connexion')
  })

  it('allows authenticated pages only after the session API confirms them', async () => {
    const proxy = (await loadProxyModule())?.proxy
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 200 }))
    vi.stubGlobal('fetch', fetcher)
    const request = new NextRequest('https://jdr.example.test/parties', {
      headers: { cookie: 'jdr_hub_access=valid-token; jdr_hub_refresh=private-refresh-token' },
    })

    const response = proxy ? await proxy(request) : null

    expect(response?.status).toBe(200)
    const [, init] = fetcher.mock.calls[0]!
    expect(new Headers(init?.headers).get('cookie')).toBe('jdr_hub_access=valid-token')
  })

  it('sends connected visitors from the presentation to their dashboard', async () => {
    const proxy = (await loadProxyModule())?.proxy
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 200 })))
    const request = new NextRequest('https://jdr.example.test/', {
      headers: { cookie: 'jdr_hub_access=valid-token' },
    })

    const response = proxy ? await proxy(request) : null

    expect(response?.status).toBe(307)
    expect(response?.headers.get('location')).toBe('https://jdr.example.test/dashboard')
  })

  it('fails closed with a non-cacheable response when the session API is unavailable', async () => {
    const proxy = (await loadProxyModule())?.proxy
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 503 })))
    const request = new NextRequest('https://jdr.example.test/dashboard', {
      headers: { cookie: 'jdr_hub_access=valid-token' },
    })

    const response = proxy ? await proxy(request) : null

    expect(response?.status).toBe(503)
    expect(response?.headers.get('cache-control')).toContain('no-store')
  })

  it('keeps the public presentation available when session verification is unavailable', async () => {
    const proxy = (await loadProxyModule())?.proxy
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 503 })))
    const request = new NextRequest('https://jdr.example.test/', {
      headers: { cookie: 'jdr_hub_access=expired-token' },
    })

    const response = proxy ? await proxy(request) : null

    expect(response?.status).toBe(200)
  })
})

import { afterEach, describe, expect, it, vi } from 'vitest'
import robots from '../app/robots'
import sitemap from '../app/sitemap'

describe('private application page indexing', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('publishes only the presentation route without requesting public resource slugs', async () => {
    const origin = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '')
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      data: { games: ['private-game'], gms: ['private-gm'], tags: ['tag'], systems: ['system'] },
      error: null,
      meta: { requestId: 'test-request-id' },
    }), { headers: { 'content-type': 'application/json' } }))
    vi.stubEnv('API_INTERNAL_URL', 'https://api.example.test')
    vi.stubGlobal('fetch', fetcher)

    const urls = await sitemap()

    expect(urls).toEqual([{ url: `${origin}/`, changeFrequency: 'daily', priority: 1 }])
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('allows crawlers to index the root only and disallows every other path', () => {
    expect(robots().rules).toEqual({ userAgent: '*', allow: '/$', disallow: '/' })
  })
})

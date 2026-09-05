import type { PublicCollection, PublicGame, PublicGamesPage, PublicGamesQuery, PublicSlugs } from '@jdr-hub/shared'

type ApiEnvelope<T> = { data: T | null }

type PublicGamesApiOptions = {
  baseUrl?: string
  fetcher?: typeof fetch
}

function apiUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/$/, '')}${path}`
}

function queryString(query: Partial<PublicGamesQuery>): string {
  const params = new URLSearchParams()
  for (const key of ['q', 'gmId', 'gmName'] as const) {
    const value = query[key]
    if (typeof value === 'string' && value.length > 0) params.set(key, value)
  }
  for (const tag of query.tagSlugs ?? []) params.append('tagSlugs', tag)
  if (query.page !== undefined) params.set('page', String(query.page))
  if (query.pageSize !== undefined) params.set('pageSize', String(query.pageSize))
  return params.toString()
}

export function createPublicGamesApi(options: PublicGamesApiOptions = {}) {
  const baseUrl = options.baseUrl ?? process.env.API_INTERNAL_URL ?? 'http://localhost:8787'
  const fetcher = options.fetcher ?? fetch

  async function request<T>(path: string): Promise<T | null> {
    try {
      const response = await fetcher(apiUrl(baseUrl, path), {
        headers: { accept: 'application/json' },
        cache: 'no-store',
      })
      if (!response.ok) return null
      const body = await response.json() as ApiEnvelope<T>
      return body.data
    } catch {
      return null
    }
  }

  return {
    list(query: Partial<PublicGamesQuery> = {}): Promise<PublicGamesPage | null> {
      const search = queryString(query)
      return request<PublicGamesPage>(`/public/games${search ? `?${search}` : ''}`)
    },
    detail(slug: string): Promise<PublicGame | null> {
      return request<PublicGame>(`/public/games/${encodeURIComponent(slug)}`)
    },
    collection(kind: 'gm' | 'tag' | 'system', slug: string): Promise<PublicCollection | null> {
      return request<PublicCollection>(`/public/${kind === 'gm' ? 'gms' : kind === 'tag' ? 'tags' : 'systems'}/${encodeURIComponent(slug)}`)
    },
    slugs(): Promise<PublicSlugs | null> {
      return request<PublicSlugs>('/public/slugs')
    },
  }
}

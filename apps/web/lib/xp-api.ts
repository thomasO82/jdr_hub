import type { XpHistoryPage } from '@jdr-hub/shared'

type ApiEnvelope<T> = { data: T | null; error?: unknown }
type XpApiOptions = { baseUrl?: string; fetcher?: typeof fetch }
type HistoryOptions = { cursor?: string; limit?: number }

function apiUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/$/, '')}${path}`
}

export function createXpApi(options: XpApiOptions = {}) {
  const baseUrl = options.baseUrl ?? process.env.NEXT_PUBLIC_API_URL ?? '/api'
  const fetcher = options.fetcher ?? fetch

  return {
    async getHistory(query: HistoryOptions = {}): Promise<XpHistoryPage | null> {
      try {
        const params = new URLSearchParams()
        if (query.cursor) params.set('cursor', query.cursor)
        if (query.limit !== undefined) params.set('limit', String(query.limit))
        const suffix = params.toString() ? `?${params.toString()}` : ''
        const response = await fetcher(apiUrl(baseUrl, `/profile/xp${suffix}`), { credentials: 'include', headers: { accept: 'application/json' }, cache: 'no-store' })
        if (!response.ok) return null
        const body = await response.json() as ApiEnvelope<XpHistoryPage>
        return body.data ?? null
      } catch {
        return null
      }
    },
  }
}

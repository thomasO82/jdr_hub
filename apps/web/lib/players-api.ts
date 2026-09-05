import type { PlayerQuery, PlayersPage } from '@jdr-hub/shared'

type ApiEnvelope<T> = { data: T | null }
type PlayersApiOptions = { baseUrl?: string; fetcher?: typeof fetch }

export function createPlayersApi(options: PlayersApiOptions = {}) {
  const baseUrl = options.baseUrl ?? process.env.NEXT_PUBLIC_API_URL ?? '/api'
  const fetcher = options.fetcher ?? fetch
  async function search(query: Partial<PlayerQuery> = {}): Promise<PlayersPage | null> {
    const params = Object.entries(query).filter(([, value]) => value !== undefined && value !== '').map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`).join('&')
    try {
      const response = await fetcher(`${baseUrl.replace(/\/$/, '')}/players${params ? `?${params}` : ''}`, { credentials: 'include', headers: { accept: 'application/json' }, cache: 'no-store' })
      if (!response.ok) return null
      return (await response.json() as ApiEnvelope<PlayersPage>).data
    } catch {
      return null
    }
  }
  return { search }
}

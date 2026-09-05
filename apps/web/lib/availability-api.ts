import type { AvailabilityPayload, AvailabilitySnapshot, PlayerQuery, PlayersPage } from '@jdr-hub/shared'

type ApiEnvelope<T> = { data: T | null }
type AvailabilityApiOptions = { baseUrl?: string; fetcher?: typeof fetch }

function apiUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/$/, '')}${path}`
}

export function createAvailabilityApi(options: AvailabilityApiOptions = {}) {
  const baseUrl = options.baseUrl ?? process.env.NEXT_PUBLIC_API_URL ?? '/api'
  const fetcher = options.fetcher ?? fetch

  async function request<T>(path: string, init?: RequestInit): Promise<T | null> {
    try {
      const response = await fetcher(apiUrl(baseUrl, path), { ...init, credentials: 'include', headers: { accept: 'application/json', ...init?.headers }, cache: 'no-store' })
      if (!response.ok) return null
      const body = await response.json() as ApiEnvelope<T>
      return body.data
    } catch {
      return null
    }
  }

  return {
    get(): Promise<AvailabilitySnapshot | null> {
      return request<AvailabilitySnapshot>('/availability')
    },
    replace(payload: AvailabilityPayload): Promise<AvailabilitySnapshot | null> {
      return request<AvailabilitySnapshot>('/availability', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) })
    },
    players(query: Partial<PlayerQuery> = {}): Promise<PlayersPage | null> {
      const params = Object.entries(query).filter(([, value]) => value !== undefined).map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`).join('&')
      return request<PlayersPage>(`/players${params ? `?${params}` : ''}`)
    },
  }
}

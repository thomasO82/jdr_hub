import type { GameMemberView } from '@jdr-hub/shared'

type ApiEnvelope<T> = { data: T | null }
type MembersApiOptions = { baseUrl?: string; origin?: string; fetcher?: typeof fetch }

function apiUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/$/, '')}${path}`
}

function browserOrigin(): string | undefined {
  return typeof window === 'undefined' ? undefined : window.location.origin
}

export function createMembersApi(options: MembersApiOptions = {}) {
  const baseUrl = options.baseUrl ?? process.env.NEXT_PUBLIC_API_URL ?? '/api'
  const origin = options.origin ?? browserOrigin()
  const fetcher = options.fetcher ?? fetch

  return {
    async listForGame(gameId: string): Promise<GameMemberView[] | null> {
      try {
        const response = await fetcher(apiUrl(baseUrl, `/games/${encodeURIComponent(gameId)}/members`), { credentials: 'include', headers: { accept: 'application/json' }, cache: 'no-store' })
        if (!response.ok) return null
        const body = await response.json() as ApiEnvelope<GameMemberView[]>
        return body.data ?? null
      } catch { return null }
    },
    async remove(gameId: string, userId: string): Promise<boolean> {
      try {
        const response = await fetcher(apiUrl(baseUrl, `/games/${encodeURIComponent(gameId)}/members/${encodeURIComponent(userId)}`), { method: 'DELETE', credentials: 'include', headers: { accept: 'application/json', ...(origin ? { origin } : {}) }, cache: 'no-store' })
        return response.ok
      } catch { return false }
    },
  }
}

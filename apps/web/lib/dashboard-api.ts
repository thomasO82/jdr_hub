import type { DashboardView, GameManagementView } from '@jdr-hub/shared'

type ApiEnvelope<T> = { data: T | null }
type DashboardApiOptions = { baseUrl?: string; fetcher?: typeof fetch }

function apiUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/$/, '')}${path}`
}

export function createDashboardApi(options: DashboardApiOptions = {}) {
  const baseUrl = options.baseUrl ?? process.env.NEXT_PUBLIC_API_URL ?? '/api'
  const fetcher = options.fetcher ?? fetch

  async function request<T>(path: string): Promise<T | null> {
    try {
      const response = await fetcher(apiUrl(baseUrl, path), { credentials: 'include', headers: { accept: 'application/json' }, cache: 'no-store' })
      if (!response.ok) return null
      const body = await response.json() as ApiEnvelope<T>
      return body.data ?? null
    } catch {
      return null
    }
  }

  return {
    getDashboard(): Promise<DashboardView | null> { return request<DashboardView>('/dashboard') },
    getManagement(gameId: string): Promise<GameManagementView | null> { return request<GameManagementView>(`/games/${encodeURIComponent(gameId)}/manage`) },
  }
}

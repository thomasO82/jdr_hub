import type { Application, ApplicationDecision, ApplicationViewerState } from '@jdr-hub/shared'

type ApiEnvelope<T> = { data: T | null }
type ApplicationsApiOptions = { baseUrl?: string; fetcher?: typeof fetch }

function apiUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/$/, '')}${path}`
}

export function createApplicationsApi(options: ApplicationsApiOptions = {}) {
  const baseUrl = options.baseUrl ?? process.env.NEXT_PUBLIC_API_URL ?? '/api'
  const fetcher = options.fetcher ?? fetch

  async function request<T>(path: string, init?: RequestInit): Promise<T | null> {
    try {
      const response = await fetcher(apiUrl(baseUrl, path), { ...init, credentials: 'include', headers: { accept: 'application/json', ...init?.headers }, cache: 'no-store' })
      if (!response.ok) return null
      const body = await response.json() as ApiEnvelope<T>
      return body.data
    } catch { return null }
  }

  return {
    submit(gameId: string, message?: string): Promise<Application | null> {
      return request<Application>(`/games/${encodeURIComponent(gameId)}/applications`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(message ? { message } : {}) })
    },
    getMineForGame(gameId: string): Promise<ApplicationViewerState | null> {
      return request<ApplicationViewerState>(`/games/${encodeURIComponent(gameId)}/application`)
    },
    listMine(): Promise<Application[] | null> { return request<Application[]>('/applications') },
    listForGame(gameId: string): Promise<Application[] | null> { return request<Application[]>(`/games/${encodeURIComponent(gameId)}/applications`) },
    decide(applicationId: string, status: ApplicationDecision['status']): Promise<Application | null> {
      return request<Application>(`/applications/${encodeURIComponent(applicationId)}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ status }) })
    },
  }
}

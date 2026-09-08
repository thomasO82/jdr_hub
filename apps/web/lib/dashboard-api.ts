import type { DashboardData } from '@jdr-hub/shared'

type ApiEnvelope = { data: unknown; error: unknown }
type DashboardApiOptions = { baseUrl?: string; fetcher?: typeof fetch }

export function createDashboardApi(options: DashboardApiOptions = {}) {
  const baseUrl = options.baseUrl ?? process.env.NEXT_PUBLIC_API_URL ?? '/api'
  const fetcher = options.fetcher ?? fetch

  return {
    async get(): Promise<DashboardData | null> {
      try {
        const response = await fetcher(`${baseUrl.replace(/\/$/, '')}/dashboard`, {
          credentials: 'include',
          headers: { accept: 'application/json' },
          cache: 'no-store',
        })
        if (!response.ok) return null
        const body = await response.json() as ApiEnvelope
        if (!body || typeof body !== 'object' || body.data === null || body.error !== null) return null
        return body.data as DashboardData
      } catch {
        return null
      }
    },
  }
}

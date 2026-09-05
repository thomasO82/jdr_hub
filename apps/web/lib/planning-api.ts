import type { PlanningPage } from '@jdr-hub/shared'

type ApiEnvelope<T> = { data: T | null }
type PlanningApiOptions = { baseUrl?: string; fetcher?: typeof fetch }

export function createPlanningApi(options: PlanningApiOptions = {}) {
  const baseUrl = options.baseUrl ?? process.env.NEXT_PUBLIC_API_URL ?? '/api'
  const fetcher = options.fetcher ?? fetch

  return {
    async get(range: { from?: string; to?: string } = {}): Promise<PlanningPage | null> {
      const params = new URLSearchParams()
      if (range.from) params.set('from', range.from)
      if (range.to) params.set('to', range.to)
      const query = params.toString()
      try {
        const response = await fetcher(`${baseUrl.replace(/\/$/, '')}/planning${query ? `?${query}` : ''}`, { credentials: 'include', headers: { accept: 'application/json' }, cache: 'no-store' })
        if (!response.ok) return null
        return (await response.json() as ApiEnvelope<PlanningPage>).data
      } catch { return null }
    },
  }
}


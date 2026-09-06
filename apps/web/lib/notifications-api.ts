import type { NotificationsPage } from '@jdr-hub/shared'

const NOTIFICATIONS_ERROR = 'Les notifications sont momentanément indisponibles. Réessayez.'

type ApiEnvelope<T> = { data: T | null }
type NotificationsApiOptions = { baseUrl?: string; origin?: string; fetcher?: typeof fetch }

function apiUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/$/, '')}${path}`
}

function browserOrigin(): string | undefined {
  return typeof window === 'undefined' ? undefined : window.location.origin
}

function throwNotificationsError(): never {
  throw new Error(NOTIFICATIONS_ERROR)
}

export function createNotificationsApi(options: NotificationsApiOptions = {}) {
  const baseUrl = options.baseUrl ?? process.env.NEXT_PUBLIC_API_URL ?? '/api'
  const origin = options.origin ?? browserOrigin()
  const fetcher = options.fetcher ?? fetch

  return {
    async getNotifications(input: { cursor?: string; limit?: number } = {}): Promise<NotificationsPage> {
      const params = new URLSearchParams()
      if (input.cursor) params.set('cursor', input.cursor)
      if (input.limit !== undefined) params.set('limit', String(input.limit))
      try {
        const query = params.toString()
        const response = await fetcher(`${apiUrl(baseUrl, '/notifications')}${query ? `?${query}` : ''}`, { credentials: 'include', headers: { accept: 'application/json' }, cache: 'no-store' })
        if (!response.ok) return throwNotificationsError()
        const body = await response.json() as ApiEnvelope<NotificationsPage>
        if (!body.data) return throwNotificationsError()
        return body.data
      } catch (error) {
        if (error instanceof Error && error.message === NOTIFICATIONS_ERROR) throw error
        return throwNotificationsError()
      }
    },
    async markNotificationRead(id: string): Promise<void> {
      try {
        const response = await fetcher(apiUrl(baseUrl, `/notifications/${encodeURIComponent(id)}/read`), {
          method: 'POST',
          credentials: 'include',
          headers: { accept: 'application/json', 'content-type': 'application/json', ...(origin ? { origin } : {}) },
          body: '{}',
          cache: 'no-store',
        })
        if (!response.ok) return throwNotificationsError()
      } catch (error) {
        if (error instanceof Error && error.message === NOTIFICATIONS_ERROR) throw error
        return throwNotificationsError()
      }
    },
  }
}

export { NOTIFICATIONS_ERROR }

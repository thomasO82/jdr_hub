import type { GameMessageView, GameMessagesPage } from '@jdr-hub/shared'

export const GAME_MESSAGES_ERROR = 'La conversation est momentanément indisponible. Réessayez.'

type ApiEnvelope<T> = { data: T | null }

type EventSourceLike = {
  onmessage: ((event: MessageEvent<string>) => void) | null
  onerror: (() => void) | null
  close: () => void
}

type GameMessagesApiOptions = {
  baseUrl?: string
  origin?: string
  fetcher?: typeof fetch
  eventSourceFactory?: (url: string, init: { withCredentials: boolean }) => EventSourceLike
}

function apiUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/$/, '')}${path}`
}

function browserOrigin(): string | undefined {
  return typeof window === 'undefined' ? undefined : window.location.origin
}

function throwGameMessagesError(): never {
  throw new Error(GAME_MESSAGES_ERROR)
}

export function createGameMessagesApi(options: GameMessagesApiOptions = {}) {
  const baseUrl = options.baseUrl ?? process.env.NEXT_PUBLIC_API_URL ?? '/api'
  const origin = options.origin ?? browserOrigin()
  const fetcher = options.fetcher ?? fetch
  const eventSourceFactory = options.eventSourceFactory ?? ((url, init) => new EventSource(url, init))

  async function readData<T>(response: Response): Promise<T> {
    if (!response.ok) return throwGameMessagesError()
    const body = await response.json() as ApiEnvelope<T>
    if (body.data === null || body.data === undefined) return throwGameMessagesError()
    return body.data
  }

  return {
    async getMessages(gameId: string, query: { cursor?: string; limit?: number } = {}): Promise<GameMessagesPage> {
      const params = new URLSearchParams()
      if (query.cursor) params.set('cursor', query.cursor)
      if (query.limit !== undefined) params.set('limit', String(query.limit))
      try {
        const suffix = params.toString()
        const response = await fetcher(apiUrl(baseUrl, `/games/${encodeURIComponent(gameId)}/messages`) + (suffix ? `?${suffix}` : ''), {
          credentials: 'include',
          headers: { accept: 'application/json' },
          cache: 'no-store',
        })
        return readData<GameMessagesPage>(response)
      } catch (error) {
        if (error instanceof Error && error.message === GAME_MESSAGES_ERROR) throw error
        return throwGameMessagesError()
      }
    },

    async sendMessage(gameId: string, content: string): Promise<GameMessageView> {
      try {
        const response = await fetcher(apiUrl(baseUrl, `/games/${encodeURIComponent(gameId)}/messages`), {
          method: 'POST',
          credentials: 'include',
          headers: { accept: 'application/json', 'content-type': 'application/json', ...(origin ? { origin } : {}) },
          body: JSON.stringify({ content: content.trim() }),
          cache: 'no-store',
        })
        return readData<GameMessageView>(response)
      } catch (error) {
        if (error instanceof Error && error.message === GAME_MESSAGES_ERROR) throw error
        return throwGameMessagesError()
      }
    },

    subscribe(gameId: string, input: { lastEventId?: string; onMessage: (message: GameMessageView) => void; onError: () => void }): () => void {
      // Native EventSource sends Last-Event-ID automatically on reconnect; it cannot set a custom header on the first connection.
      const source = eventSourceFactory(apiUrl(baseUrl, `/games/${encodeURIComponent(gameId)}/messages/stream`), { withCredentials: true })
      source.onmessage = (event: MessageEvent<string>) => {
        try {
          input.onMessage(JSON.parse(event.data) as GameMessageView)
        } catch {
          input.onError()
        }
      }
      source.onerror = () => input.onError()
      return () => {
        source.onmessage = null
        source.onerror = null
        source.close()
      }
    },
  }
}

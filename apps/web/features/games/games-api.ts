export type PublicGame = {
  id: string
  ownerId: string
  slug: string
  title: string
  system: string
  description: string
  type: 'ONE_SHOT' | 'CAMPAIGN'
  status: 'OPEN' | 'ACTIVE'
  visibility: 'PUBLIC'
  maxPlayers: number
  tags: string[]
}

export type GamesPage = {
  items: PublicGame[]
  page: number
  pageSize: number
}

export type GameTag = {
  name: string
  slug: string
}

type ApiEnvelope<T> = {
  data: T | null
}

type GamesApiOptions = {
  baseUrl?: string
  fetcher?: typeof fetch
}

function apiUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/$/, '')}${path}`
}

export function createGamesApi(options: GamesApiOptions = {}) {
  const baseUrl = options.baseUrl ?? process.env.API_INTERNAL_URL ?? 'http://localhost:8787'
  const fetcher = options.fetcher ?? fetch

  async function request<T>(path: string): Promise<T | null> {
    try {
      const response = await fetcher(apiUrl(baseUrl, path), {
        headers: { accept: 'application/json' },
        cache: 'no-store',
      })
      if (!response.ok) return null
      const body = await response.json() as ApiEnvelope<T>
      return body.data
    } catch {
      return null
    }
  }

  return {
    list(query = ''): Promise<GamesPage | null> {
      return request<GamesPage>(`/games${query ? `?${query}` : ''}`)
    },
    detail(slug: string): Promise<PublicGame | null> {
      return request<PublicGame>(`/public/games/${encodeURIComponent(slug)}`)
    },
    tags(): Promise<GameTag[] | null> {
      return request<GameTag[]>('/tags')
    },
  }
}

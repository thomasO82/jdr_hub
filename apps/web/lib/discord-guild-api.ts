const MEMBERSHIP_ERROR = 'Le statut Discord est indisponible. Réessayez dans un instant.'
const DISMISS_ERROR = 'Votre choix n’a pas pu être enregistré. Réessayez.'

type ApiEnvelope<T> = { data: T | null }
type DiscordGuildApiOptions = { baseUrl?: string; origin?: string; fetcher?: typeof fetch }

export type DiscordGuildMembership = {
  joined: boolean
  promptDismissed: boolean
  username: string
  avatarUrl: string | null
}

function apiUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/$/, '')}${path}`
}

function browserOrigin(): string | undefined {
  return typeof window === 'undefined' ? undefined : window.location.origin
}

function isMembership(value: unknown): value is {
  username: string
  avatarUrl: string | null
  discordServerJoined: boolean
  discordServerPromptDismissed: boolean
} {
  if (!value || typeof value !== 'object') return false
  const user = value as Record<string, unknown>
  return typeof user.username === 'string'
    && (typeof user.avatarUrl === 'string' || user.avatarUrl === null)
    && typeof user.discordServerJoined === 'boolean'
    && typeof user.discordServerPromptDismissed === 'boolean'
}

export function createDiscordGuildApi(options: DiscordGuildApiOptions = {}) {
  const baseUrl = options.baseUrl ?? process.env.NEXT_PUBLIC_API_URL ?? '/api'
  const origin = options.origin ?? browserOrigin()
  const fetcher = options.fetcher ?? fetch

  return {
    async getMembership(): Promise<DiscordGuildMembership | null> {
      try {
        const response = await fetcher(apiUrl(baseUrl, '/me'), {
          credentials: 'include',
          headers: { accept: 'application/json' },
          cache: 'no-store',
        })
        if (response.status === 401) return null
        if (!response.ok) throw new Error(MEMBERSHIP_ERROR)
        const body = await response.json() as ApiEnvelope<unknown>
        if (!isMembership(body.data)) throw new Error(MEMBERSHIP_ERROR)
        return {
          joined: body.data.discordServerJoined,
          promptDismissed: body.data.discordServerPromptDismissed,
          username: body.data.username,
          avatarUrl: body.data.avatarUrl,
        }
      } catch {
        throw new Error(MEMBERSHIP_ERROR)
      }
    },

    async dismissPrompt(): Promise<void> {
      try {
        const response = await fetcher(apiUrl(baseUrl, '/auth/discord/server/dismiss'), {
          method: 'POST',
          credentials: 'include',
          headers: { accept: 'application/json', 'content-type': 'application/json', ...(origin ? { origin } : {}) },
          body: '{}',
          cache: 'no-store',
        })
        if (!response.ok) throw new Error(DISMISS_ERROR)
      } catch {
        throw new Error(DISMISS_ERROR)
      }
    },
  }
}

export { DISMISS_ERROR, MEMBERSHIP_ERROR }

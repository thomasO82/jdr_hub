import type { Invitation, InvitationDecision, InvitationsPage } from '@jdr-hub/shared'

type ApiEnvelope<T> = { data: T | null }
type InvitationsApiOptions = { baseUrl?: string; origin?: string; fetcher?: typeof fetch }

function apiUrl(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/$/, '')}${path}`
}

function browserOrigin(): string | undefined {
  return typeof window === 'undefined' ? undefined : window.location.origin
}

export function createInvitationsApi(options: InvitationsApiOptions = {}) {
  const baseUrl = options.baseUrl ?? process.env.NEXT_PUBLIC_API_URL ?? '/api'
  const origin = options.origin ?? browserOrigin()
  const fetcher = options.fetcher ?? fetch

  async function request<T>(path: string, init?: RequestInit): Promise<T | null> {
    try {
      const response = await fetcher(apiUrl(baseUrl, path), { ...init, credentials: 'include', headers: { accept: 'application/json', ...init?.headers }, cache: 'no-store' })
      if (!response.ok) return null
      const body = await response.json() as ApiEnvelope<T>
      return body.data ?? null
    } catch {
      return null
    }
  }

  const mutationHeaders = { 'content-type': 'application/json', ...(origin ? { origin } : {}) }
  return {
    listForGame(gameId: string): Promise<InvitationsPage | null> { return request<InvitationsPage>(`/games/${encodeURIComponent(gameId)}/invitations`) },
    listMine(): Promise<InvitationsPage | null> { return request<InvitationsPage>('/invitations') },
    create(gameId: string, inviteeId: string): Promise<Invitation | null> { return request<Invitation>(`/games/${encodeURIComponent(gameId)}/invitations`, { method: 'POST', headers: mutationHeaders, body: JSON.stringify({ inviteeId }) }) },
    decide(invitationId: string, status: InvitationDecision['status']): Promise<Invitation | null> { return request<Invitation>(`/invitations/${encodeURIComponent(invitationId)}`, { method: 'PATCH', headers: mutationHeaders, body: JSON.stringify({ status }) }) },
  }
}

import type { FixedSessionInput, ProposalInput, SchedulingProposal, PlanningPage, SessionCommand, SessionUpdateInput, VoteValue } from '@jdr-hub/shared'

type ApiEnvelope<T> = { data: T | null }
type SchedulingApiOptions = { baseUrl?: string; fetcher?: typeof fetch }

export function createSchedulingApi(options: SchedulingApiOptions = {}) {
  const baseUrl = options.baseUrl ?? process.env.NEXT_PUBLIC_API_URL ?? '/api'
  const fetcher = options.fetcher ?? fetch
  async function request<T>(path: string, init?: RequestInit): Promise<T | null> {
    try {
      const response = await fetcher(`${baseUrl.replace(/\/$/, '')}${path}`, { ...init, credentials: 'include', headers: { accept: 'application/json', ...init?.headers }, cache: 'no-store' })
      if (!response.ok) return null
      return (await response.json() as ApiEnvelope<T>).data
    } catch { return null }
  }
  const json = (method: 'POST' | 'PATCH', body: unknown): RequestInit => ({ method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
  return {
    listProposals(gameId: string): Promise<SchedulingProposal[] | null> { return request(`/games/${encodeURIComponent(gameId)}/proposals`) },
    listGameSessions(gameId: string): Promise<PlanningPage['items'] | null> { return request(`/games/${encodeURIComponent(gameId)}/sessions`) },
    createProposals(gameId: string, slots: ProposalInput['slots']): Promise<SchedulingProposal[] | null> { return request(`/games/${encodeURIComponent(gameId)}/proposals`, json('POST', { slots })) },
    vote(proposalId: string, vote: VoteValue): Promise<SchedulingProposal[] | null> { return request(`/proposals/${encodeURIComponent(proposalId)}/votes`, json('POST', { vote })) },
    createSession(gameId: string, input: FixedSessionInput | SessionCommand): Promise<PlanningPage['items'][number] | null> { return request(`/games/${encodeURIComponent(gameId)}/sessions`, json('POST', input)) },
    updateSession(gameId: string, sessionId: string, input: SessionUpdateInput): Promise<PlanningPage['items'][number] | null> { return request(`/games/${encodeURIComponent(gameId)}/sessions/${encodeURIComponent(sessionId)}`, json('PATCH', input)) },
    cancelSession(gameId: string, sessionId: string): Promise<PlanningPage['items'][number] | null> { return request(`/games/${encodeURIComponent(gameId)}/sessions/${encodeURIComponent(sessionId)}`, json('PATCH', { status: 'CANCELLED' })) },
  }
}


import type { FixedSessionInput, ProposalInput, SchedulingProposal, PlanningPage, SessionCommand, VoteValue } from '@jdr-hub/shared'

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
  const json = (body: unknown): RequestInit => ({ method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
  return {
    listProposals(gameId: string): Promise<SchedulingProposal[] | null> { return request(`/games/${encodeURIComponent(gameId)}/proposals`) },
    createProposals(gameId: string, slots: ProposalInput['slots']): Promise<SchedulingProposal[] | null> { return request(`/games/${encodeURIComponent(gameId)}/proposals`, json({ slots })) },
    vote(proposalId: string, vote: VoteValue): Promise<SchedulingProposal[] | null> { return request(`/proposals/${encodeURIComponent(proposalId)}/votes`, json({ vote })) },
    createSession(gameId: string, input: FixedSessionInput | SessionCommand): Promise<PlanningPage['items'][number] | null> { return request(`/games/${encodeURIComponent(gameId)}/sessions`, json(input)) },
  }
}


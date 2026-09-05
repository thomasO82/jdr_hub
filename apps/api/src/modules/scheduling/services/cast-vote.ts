import type { VoteValue } from '@jdr-hub/shared'
import type { ProposalView, SchedulingRepository } from '../repository.js'

export async function castVote(input: { proposalId: string; userId: string; vote: VoteValue; repository: SchedulingRepository; now?: () => Date }): Promise<ProposalView[]> {
  const proposal = await input.repository.findProposal(input.proposalId)
  if (!proposal) throw new Error('SCHEDULING_NOT_FOUND')
  if (proposal.status !== 'OPEN') throw new Error('SCHEDULING_CONFLICT')
  if (!await input.repository.isActiveMember(proposal.gameId, input.userId)) throw new Error('SCHEDULING_FORBIDDEN')
  await input.repository.createVote({ proposalId: proposal.id, userId: input.userId, vote: input.vote, now: (input.now ?? (() => new Date()))() })
  return input.repository.listProposals(proposal.gameId, input.userId)
}


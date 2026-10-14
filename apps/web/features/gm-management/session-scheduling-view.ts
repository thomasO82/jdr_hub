import type { SchedulingProposal, SessionStatus, ProposalRoundStatus } from '@jdr-hub/shared'

export type ProposalRoundView = { roundId: string; status: ProposalRoundStatus; proposals: SchedulingProposal[] }

export function groupProposalRounds(proposals: SchedulingProposal[]): ProposalRoundView[] {
  const rounds = new Map<string, ProposalRoundView>()
  for (const proposal of proposals) {
    const existing = rounds.get(proposal.roundId)
    if (existing) existing.proposals.push(proposal)
    else rounds.set(proposal.roundId, { roundId: proposal.roundId, status: proposal.roundStatus, proposals: [proposal] })
  }
  return [...rounds.values()]
}

export function proposalRoundLabel(status: ProposalRoundStatus): string {
  switch (status) {
    case 'OPEN': return 'Vote en cours'
    case 'SELECTED': return 'Créneau retenu'
    case 'CLOSED': return 'Clôturée'
    case 'CANCELLED': return 'Séance annulée'
  }
}

export function canManageSession(status: SessionStatus): boolean {
  return status === 'SCHEDULED'
}

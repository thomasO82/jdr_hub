import type { SchedulingProposal } from '@jdr-hub/shared'

/** A vote is accepted only while both its proposal and its round remain open. */
export function canVoteOnProposal(proposal: SchedulingProposal): boolean {
  return proposal.status === 'OPEN' && proposal.roundStatus === 'OPEN'
}

/** Returns whether this user can still add a vote to the proposal. */
export function canCastVote(proposal: SchedulingProposal): boolean {
  return canVoteOnProposal(proposal) && proposal.userVote === null
}

/** Explains why a proposal's vote controls are no longer available. */
export function proposalVoteStatusLabel(proposal: SchedulingProposal): string | null {
  if (proposal.roundStatus === 'CANCELLED') return 'Séance annulée'
  if (proposal.status === 'SELECTED') return 'Créneau retenu'
  if (proposal.roundStatus !== 'OPEN') return 'Vote clôturé'
  if (proposal.status !== 'OPEN') return 'Proposition clôturée'
  return null
}

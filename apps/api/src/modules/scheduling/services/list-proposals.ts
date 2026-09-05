import type { ProposalView, SchedulingRepository } from '../repository.js'

export async function listProposals(input: { gameId: string; userId: string; repository: SchedulingRepository }): Promise<ProposalView[]> {
  const game = await input.repository.findGame(input.gameId)
  if (!game) throw new Error('SCHEDULING_NOT_FOUND')
  if (!await input.repository.isActiveMember(game.id, input.userId)) throw new Error('SCHEDULING_FORBIDDEN')
  return input.repository.listProposals(game.id, input.userId)
}


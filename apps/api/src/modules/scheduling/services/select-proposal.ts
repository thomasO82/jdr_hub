import type { SchedulingRepository, SessionRecord } from '../repository.js'

export async function selectProposal(input: { gameId: string; ownerId: string; proposalId: string; repository: SchedulingRepository; now?: () => Date }): Promise<SessionRecord> {
  const game = await input.repository.findGame(input.gameId)
  if (!game) throw new Error('SCHEDULING_NOT_FOUND')
  if (game.ownerId !== input.ownerId) throw new Error('SCHEDULING_FORBIDDEN')
  return input.repository.selectProposal({ gameId: game.id, proposalId: input.proposalId, now: (input.now ?? (() => new Date()))() })
}


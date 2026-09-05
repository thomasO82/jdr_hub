import type { SessionWindow } from '@jdr-hub/shared'
import type { ProposalRecord, SchedulingRepository } from '../repository.js'

export async function createProposals(input: { gameId: string; ownerId: string; slots: SessionWindow[]; repository: SchedulingRepository; now?: () => Date }): Promise<ProposalRecord[]> {
  const game = await input.repository.findGame(input.gameId)
  if (!game) throw new Error('SCHEDULING_NOT_FOUND')
  if (game.ownerId !== input.ownerId) throw new Error('SCHEDULING_FORBIDDEN')
  if (game.status !== 'OPEN' && game.status !== 'ACTIVE') throw new Error('SCHEDULING_CONFLICT')
  return input.repository.createProposals({ gameId: game.id, proposerId: input.ownerId, slots: input.slots, now: (input.now ?? (() => new Date()))() })
}


import type { SchedulingRepository, SessionRecord } from '../repository.js'

export async function listGameSessions(input: { gameId: string; ownerId: string; repository: SchedulingRepository }): Promise<SessionRecord[]> {
  const game = await input.repository.findGame(input.gameId)
  if (!game) throw new Error('SCHEDULING_NOT_FOUND')
  if (game.ownerId !== input.ownerId) throw new Error('SCHEDULING_FORBIDDEN')
  return input.repository.listGameSessions(game.id)
}

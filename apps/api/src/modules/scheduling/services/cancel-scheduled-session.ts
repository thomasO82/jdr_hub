import type { SchedulingRepository, SessionRecord } from '../repository.js'

export async function cancelScheduledSession(input: { gameId: string; sessionId: string; ownerId: string; repository: SchedulingRepository; now?: () => Date }): Promise<SessionRecord> {
  const game = await input.repository.findGame(input.gameId)
  if (!game) throw new Error('SCHEDULING_NOT_FOUND')
  if (game.ownerId !== input.ownerId) throw new Error('SCHEDULING_FORBIDDEN')
  return input.repository.cancelScheduledSession({ gameId: game.id, sessionId: input.sessionId, now: (input.now ?? (() => new Date()))() })
}

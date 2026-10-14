import type { SchedulingRepository, SessionRecord } from '../repository.js'

export async function updateScheduledSession(input: { gameId: string; sessionId: string; ownerId: string; startsAt: string; endsAt: string; repository: SchedulingRepository; now?: () => Date }): Promise<SessionRecord> {
  const game = await input.repository.findGame(input.gameId)
  if (!game) throw new Error('SCHEDULING_NOT_FOUND')
  if (game.ownerId !== input.ownerId) throw new Error('SCHEDULING_FORBIDDEN')
  return input.repository.updateScheduledSession({ gameId: game.id, sessionId: input.sessionId, startsAt: new Date(input.startsAt), endsAt: new Date(input.endsAt), now: (input.now ?? (() => new Date()))() })
}

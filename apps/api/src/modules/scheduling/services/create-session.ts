import type { FixedSessionInput } from '@jdr-hub/shared'
import { canCreateSession } from '../policy.js'
import type { SchedulingRepository, SessionRecord } from '../repository.js'

export async function createSession(input: { gameId: string; ownerId: string; startsAt: string; endsAt: string; notes: FixedSessionInput['notes']; repository: SchedulingRepository; now?: () => Date }): Promise<SessionRecord> {
  const game = await input.repository.findGame(input.gameId)
  if (!game) throw new Error('SCHEDULING_NOT_FOUND')
  if (game.ownerId !== input.ownerId) throw new Error('SCHEDULING_FORBIDDEN')
  if (!canCreateSession(game, await input.repository.countSessions(game.id))) throw new Error('SCHEDULING_CONFLICT')
  const now = (input.now ?? (() => new Date()))()
  return input.repository.createFixedSession({ gameId: game.id, startsAt: new Date(input.startsAt), endsAt: new Date(input.endsAt), notes: input.notes, now })
}


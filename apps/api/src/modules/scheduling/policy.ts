import type { GameStatus, GameType } from '@jdr-hub/shared'

export function canCreateSession(game: { type: GameType; status: GameStatus }, existingSessionCount: number): boolean {
  if (game.status !== 'OPEN' && game.status !== 'ACTIVE') return false
  if (game.type === 'ONE_SHOT' && existingSessionCount >= 3) return false
  return existingSessionCount >= 0
}


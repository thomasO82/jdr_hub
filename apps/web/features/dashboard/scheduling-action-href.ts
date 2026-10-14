import type { SchedulingAction } from '@jdr-hub/shared'

/** Returns the next action route for a dashboard scheduling item. */
export function schedulingActionHref(action: Pick<SchedulingAction, 'kind' | 'gameId'>): string | null {
  return action.kind === 'VOTE' ? `/parties/${encodeURIComponent(action.gameId)}/vote` : null
}

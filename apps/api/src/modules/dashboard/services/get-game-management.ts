import type { GameManagementView } from '@jdr-hub/shared'
import type { DashboardRepository } from '../repository.js'

export async function getGameManagement(input: { userId: string; gameId: string; repository: DashboardRepository; now?: () => Date }): Promise<GameManagementView> {
  const view = await input.repository.getGameManagement(input.gameId, input.userId, (input.now ?? (() => new Date()))())
  if (!view) throw new Error('DASHBOARD_NOT_FOUND')
  return view
}

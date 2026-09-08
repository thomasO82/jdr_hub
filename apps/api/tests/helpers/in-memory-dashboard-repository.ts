import type { DashboardGameSummary, DashboardSessionSummary } from '@jdr-hub/shared'
import type { DashboardRepository } from '../../src/modules/dashboard/repository.js'

export function createInMemoryDashboardRepository(input: { nextSession?: DashboardSessionSummary | null; activeGames?: DashboardGameSummary[] } = {}): DashboardRepository {
  return {
    async findNextSession() {
      return input.nextSession ?? null
    },
    async listActiveGames() {
      return input.activeGames ?? []
    },
  }
}

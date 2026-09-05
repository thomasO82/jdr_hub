import type { AvailabilityRepository, AvailabilitySnapshot, PlayerSearchQuery, PlayersPage } from '../../src/modules/availability/repository.js'

type SeedPlayer = AvailabilitySnapshot & { username: string; avatarUrl: string | null; level: number | null }

export function createInMemoryAvailabilityRepository(input: { snapshots?: SeedPlayer[] } = {}): AvailabilityRepository & { replacements: AvailabilitySnapshot[] } {
  const snapshots = new Map(input.snapshots?.map((snapshot) => [snapshot.userId, structuredClone(snapshot)]) ?? [])
  const replacements: AvailabilitySnapshot[] = []
  return {
    replacements,
    async getForUser(userId) {
      const snapshot = snapshots.get(userId)
      return snapshot ? structuredClone(snapshot) : null
    },
    async replaceForUser(userId, snapshot) {
      const current = { ...structuredClone(snapshot), userId }
      snapshots.set(userId, current)
      replacements.push(structuredClone(current))
      return structuredClone(current)
    },
    async searchPlayers(query: PlayerSearchQuery) {
      const items = [...snapshots.values()]
        .filter((player) => !query.q || player.username.toLowerCase().includes(query.q.toLowerCase()))
        .filter((player) => !query.system || player.preferredSystems.includes(query.system))
        .slice((query.page - 1) * query.pageSize, query.page * query.pageSize)
        .map((player) => ({
          id: player.userId,
          username: player.username,
          avatarUrl: player.avatarUrl,
          level: player.level,
          preferredSystems: player.preferredSystems,
          availabilityCompatible: player.preferences.availabilityPublic && query.dayOfWeek !== undefined && query.startMinute !== undefined && query.endMinute !== undefined
            ? player.rules.some((rule) => rule.dayOfWeek === query.dayOfWeek && rule.startMinute < query.endMinute! && rule.endMinute > query.startMinute!)
            : null,
        }))
      return { items, page: query.page, pageSize: query.pageSize } satisfies PlayersPage
    },
  }
}

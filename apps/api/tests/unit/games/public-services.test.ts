import { describe, expect, it } from 'vitest'
import { listPublicGames } from '../../../src/modules/games/services/list-public-games.js'
import type { PublicGamesRepository } from '../../../src/modules/games/repository.js'

describe('public game services', () => {
  it('delegates public list queries without changing the result', async () => {
    const expected = { items: [], page: 1, pageSize: 20 }
    const repository: PublicGamesRepository = {
      async listPublic() { return expected },
      async findPublicBySlug() { return null },
      async findPublicCollection() { return null },
      async listPublicSlugs() { return { games: [], gms: [], tags: [], systems: [] } },
    }

    await expect(listPublicGames({
      query: { tagSlugs: [], page: 1, pageSize: 20 },
      repository,
    })).resolves.toBe(expected)
  })
})

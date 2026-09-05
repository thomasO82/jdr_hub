import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { seedData } from '../src/seed-data.js'
import { assertSeedEnvironment } from '../src/seed.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

describe('development seed data', () => {
  it('contains stable fictitious users, games and tags', () => {
    expect(seedData.users.length).toBeGreaterThanOrEqual(2)
    expect(seedData.games.length).toBeGreaterThanOrEqual(4)
    expect(seedData.tags.length).toBeGreaterThanOrEqual(4)

    expect(new Set(seedData.users.map((user) => user.id)).size).toBe(seedData.users.length)
    expect(new Set(seedData.games.map((game) => game.slug)).size).toBe(seedData.games.length)
    expect(new Set(seedData.tags.map((tag) => tag.slug)).size).toBe(seedData.tags.length)

    expect(seedData.games).toEqual(expect.arrayContaining([
      expect.objectContaining({ slug: 'la-vallee-des-brumes', status: 'OPEN', visibility: 'PUBLIC' }),
      expect.objectContaining({ slug: 'station-orbite-9', status: 'ACTIVE', visibility: 'PUBLIC' }),
      expect.objectContaining({ slug: 'campagne-privee-test', visibility: 'PRIVATE' }),
      expect.objectContaining({ slug: 'brouillon-test', status: 'DRAFT' }),
    ]))
  })

  it('references only seeded users, games and tags', () => {
    const userIds = new Set(seedData.users.map((user) => user.id))
    const gameIds = new Set(seedData.games.map((game) => game.id))
    const tagSlugs = new Set(seedData.tags.map((tag) => tag.slug))

    expect(seedData.games.every((game) => userIds.has(game.ownerId))).toBe(true)
    expect(seedData.gameTags.every((link) => gameIds.has(link.gameId) && tagSlugs.has(link.tagSlug))).toBe(true)
    expect(seedData.applications.every((application) => gameIds.has(application.gameId) && userIds.has(application.userId))).toBe(true)
    expect(seedData.members.every((member) => gameIds.has(member.gameId) && userIds.has(member.userId))).toBe(true)
  })

  it('uses conflict-safe writes so it can be rerun', () => {
    const source = readFileSync(resolve(root, 'src/seed.ts'), 'utf8')

    expect(source).toContain('.onConflictDoUpdate')
    expect(source).toContain('.onConflictDoNothing')
  })

  it('refuses to run in production', () => {
    expect(() => assertSeedEnvironment('production')).toThrow(
      'Development seed cannot run in production',
    )
    expect(() => assertSeedEnvironment('development')).not.toThrow()
    expect(() => assertSeedEnvironment(undefined)).not.toThrow()
  })

  it('uses a dedicated executable entrypoint', () => {
    const source = readFileSync(resolve(root, 'src/seed-cli.ts'), 'utf8')

    expect(source).toContain("import { main } from './seed.js'")
    expect(source).toContain('await main()')
  })
})

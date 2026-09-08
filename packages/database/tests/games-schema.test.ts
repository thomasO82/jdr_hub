import { getTableColumns, getTableName } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { gameTags, games, tags } from '../src/schema/games.js'

describe('games database schema', () => {
  it('models games separately from tags and preserves relational links', () => {
    expect(getTableName(games)).toBe('games')
    expect(getTableName(tags)).toBe('tags')
    expect(getTableName(gameTags)).toBe('game_tags')
    expect(getTableColumns(games).ownerId.notNull).toBe(true)
    expect(getTableColumns(games).slug.isUnique).toBe(true)
    expect(getTableColumns(games).format.notNull).toBe(true)
    expect(getTableColumns(tags).slug.isUnique).toBe(true)
    expect(getTableColumns(gameTags).gameId.notNull).toBe(true)
    expect(getTableColumns(gameTags).tagId.notNull).toBe(true)
  })

  it('adds a migration-safe format field for catalogue filtering', async () => {
    const migration = await import('node:fs/promises').then(({ readFile }) => readFile(new URL('../migrations/0010_lyrical_karnak.sql', import.meta.url), 'utf8'))
    expect(migration).toContain('ADD COLUMN "format"')
    expect(migration).toContain('DEFAULT \'ONLINE\'')
    expect(migration).toContain('games_format_index')
    expect(migration).not.toMatch(/\bDROP\s+(TABLE|COLUMN|INDEX)\b/i)
  })
})

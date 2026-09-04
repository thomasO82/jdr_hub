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
    expect(getTableColumns(tags).slug.isUnique).toBe(true)
    expect(getTableColumns(gameTags).gameId.notNull).toBe(true)
    expect(getTableColumns(gameTags).tagId.notNull).toBe(true)
  })
})

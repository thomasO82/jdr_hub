import { getTableColumns, getTableName } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { applications, gameMembers } from '../src/schema/games.js'

describe('applications database schema', () => {
  it('models applications and the player roster with relational constraints', () => {
    expect(getTableName(applications)).toBe('applications')
    expect(getTableName(gameMembers)).toBe('game_members')
    expect(getTableColumns(applications).gameId.notNull).toBe(true)
    expect(getTableColumns(applications).userId.notNull).toBe(true)
    expect(getTableColumns(applications).status.notNull).toBe(true)
    expect(getTableColumns(gameMembers).gameId.notNull).toBe(true)
    expect(getTableColumns(gameMembers).userId.notNull).toBe(true)
  })
})

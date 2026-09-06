import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { getTableColumns, getTableName } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { gameMessages } from '../src/schema/game-messages.js'

const migrationPath = resolve(import.meta.dirname, '../migrations/0008_game_messages.sql')

describe('game messages database schema', () => {
  it('defines the durable message projection and pagination columns', () => {
    const columns = getTableColumns(gameMessages)

    expect(getTableName(gameMessages)).toBe('game_messages')
    expect(columns.id.primary).toBe(true)
    expect(columns.gameId.notNull).toBe(true)
    expect(columns.authorId.notNull).toBe(true)
    expect(columns.content.notNull).toBe(true)
    expect(columns.content.columnType).toBe('PgVarchar')
    expect(columns.content.config.length).toBe(2_000)
    expect(columns.createdAt.notNull).toBe(true)
    expect(columns.createdAt.hasDefault).toBe(true)
  })

  it('contains the additive table migration and composite pagination index', () => {
    const migration = readFileSync(migrationPath, 'utf8')

    expect(migration).toContain('CREATE TABLE "game_messages"')
    expect(migration).toContain('game_messages_game_created_id_index')
    expect(migration).toContain('REFERENCES "public"."games"')
    expect(migration).toContain('REFERENCES "public"."users"')
    expect(migration).not.toMatch(/\bDROP\s+(TABLE|COLUMN|INDEX)\b/i)
  })
})

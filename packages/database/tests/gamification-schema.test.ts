import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { getTableColumns, getTableName } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { authSchema } from '../src/index.js'
import { xpEvents } from '../src/schema/gamification.js'

const migrationPath = resolve(import.meta.dirname, '../migrations/0009_lethal_mattie_franklin.sql')

describe('XP database schema', () => {
  it('exports XP projections and the idempotent event table', () => {
    const userColumns = getTableColumns(authSchema.users)
    const eventColumns = getTableColumns(xpEvents)

    expect(userColumns.xp).toBeDefined()
    expect(userColumns.level).toBeDefined()
    expect(getTableName(xpEvents)).toBe('xp_events')
    expect(eventColumns.userId.notNull).toBe(true)
    expect(eventColumns.sessionId.notNull).toBe(false)
    expect(eventColumns.amount.notNull).toBe(true)
    expect(eventColumns.idempotencyKey.notNull).toBe(true)
  })

  it('contains additive XP constraints and indexes', () => {
    const migration = readFileSync(migrationPath, 'utf8')

    expect(migration).toContain('CREATE TABLE "xp_events"')
    expect(migration).toContain('xp_events_idempotency_key_unique')
    expect(migration).toMatch(/amount.*CHECK/i)
    expect(migration).toContain('xp_events_user_created_index')
    expect(migration).toContain('xp_events_session_id_index')
    expect(migration).not.toMatch(/\bDROP\s+(TABLE|COLUMN|INDEX)\b/i)
  })
})

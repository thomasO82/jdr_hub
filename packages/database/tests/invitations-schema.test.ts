import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { getTableColumns, getTableName } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { invitations } from '../src/schema/invitations.js'

const migrationPath = resolve(import.meta.dirname, '../migrations/0008_invitations.sql')

describe('invitations database schema', () => {
  it('defines the invitation table and server-controlled timestamps', () => {
    const columns = getTableColumns(invitations)

    expect(getTableName(invitations)).toBe('invitations')
    expect(columns.gameId.notNull).toBe(true)
    expect(columns.inviterId.notNull).toBe(true)
    expect(columns.inviteeId.notNull).toBe(true)
    expect(columns.status.notNull).toBe(true)
    expect(columns.expiresAt.notNull).toBe(true)
    expect(columns.createdAt.notNull).toBe(true)
    expect(columns.updatedAt.notNull).toBe(true)
    expect(columns.status.hasDefault).toBe(true)
  })

  it('contains additive migration constraints and pending uniqueness', () => {
    const migration = readFileSync(migrationPath, 'utf8')

    expect(migration).toContain('CREATE TABLE "invitations"')
    expect(migration).toContain('invitations_pending_game_invitee_unique')
    expect(migration).toContain("WHERE \"status\" = 'PENDING'")
    expect(migration).toContain('invitations_invitee_id_index')
    expect(migration).toContain('invitations_expires_at_index')
    expect(migration).not.toMatch(/\bDROP\s+(TABLE|COLUMN|INDEX)\b/i)
  })
})

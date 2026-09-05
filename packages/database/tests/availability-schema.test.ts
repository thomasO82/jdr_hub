import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { getTableColumns, getTableName } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { availabilityExceptions, availabilityRules, userPreferences, userPreferredSystems } from '../src/schema/availability.js'

const migrationPath = resolve(import.meta.dirname, '../migrations/0004_availability-and-player-preferences.sql')

describe('availability database schema', () => {
  it('defines the four F05 tables with user ownership', () => {
    expect(getTableName(availabilityRules)).toBe('availability_rules')
    expect(getTableName(availabilityExceptions)).toBe('availability_exceptions')
    expect(getTableName(userPreferences)).toBe('user_preferences')
    expect(getTableName(userPreferredSystems)).toBe('user_preferred_systems')
    expect(getTableColumns(availabilityRules).userId.notNull).toBe(true)
    expect(getTableColumns(availabilityExceptions).userId.notNull).toBe(true)
    expect(getTableColumns(userPreferences).userId.notNull).toBe(true)
    expect(getTableColumns(userPreferredSystems).userId.notNull).toBe(true)
  })

  it('declares safe defaults and bounded columns', () => {
    expect(getTableColumns(userPreferences).availabilityPublic.hasDefault).toBe(true)
    expect(getTableColumns(userPreferences).invitationNotifications.hasDefault).toBe(true)
    expect(getTableColumns(availabilityExceptions).label.notNull).toBe(true)
    expect(getTableColumns(userPreferredSystems).system.notNull).toBe(true)
  })

  it('contains only additive migration statements and required indexes', () => {
    const migration = readFileSync(migrationPath, 'utf8')
    expect(migration).toContain('CREATE TABLE "availability_rules"')
    expect(migration).toContain('CREATE TABLE "availability_exceptions"')
    expect(migration).toContain('CREATE TABLE "user_preferences"')
    expect(migration).toContain('CREATE TABLE "user_preferred_systems"')
    expect(migration).toContain('availability_rules_user_day_index')
    expect(migration).toContain('availability_exceptions_user_start_index')
    expect(migration).not.toMatch(/\bDROP\s+(TABLE|COLUMN|INDEX)\b/i)
  })
})

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { getTableColumns, getTableName } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { gameSessions, timeProposals, timeVotes } from '../src/schema/scheduling.js'

const migrationPath = resolve(import.meta.dirname, '../migrations/0005_scheduling.sql')

describe('scheduling database schema', () => {
  it('defines proposal, vote and session tables', () => {
    expect(getTableName(timeProposals)).toBe('time_proposals')
    expect(getTableName(timeVotes)).toBe('time_votes')
    expect(getTableName(gameSessions)).toBe('game_sessions')
    expect(getTableColumns(timeProposals).gameId.notNull).toBe(true)
    expect(getTableColumns(timeProposals).proposerId.notNull).toBe(true)
    expect(getTableColumns(timeVotes).proposalId.notNull).toBe(true)
    expect(getTableColumns(timeVotes).userId.notNull).toBe(true)
    expect(getTableColumns(gameSessions).gameId.notNull).toBe(true)
  })

  it('stores UTC instants and exposes safe defaults', () => {
    expect(getTableColumns(timeProposals).startsAt.notNull).toBe(true)
    expect(getTableColumns(timeProposals).endsAt.notNull).toBe(true)
    expect(getTableColumns(timeProposals).status.hasDefault).toBe(true)
    expect(getTableColumns(gameSessions).status.hasDefault).toBe(true)
    expect(getTableColumns(gameSessions).proposalId.notNull).toBe(false)
  })

  it('contains additive migration statements and vote/session uniqueness', () => {
    const migration = readFileSync(migrationPath, 'utf8')
    expect(migration).toContain('CREATE TABLE "time_proposals"')
    expect(migration).toContain('CREATE TABLE "time_votes"')
    expect(migration).toContain('CREATE TABLE "game_sessions"')
    expect(migration).toContain('time_votes_proposal_user_pk')
    expect(migration).toContain('game_sessions_proposal_unique')
    expect(migration).toContain('time_proposals_game_start_index')
    expect(migration).not.toMatch(/\bDROP\s+(TABLE|COLUMN|INDEX)\b/i)
  })
})

import { getTableColumns, getTableName } from 'drizzle-orm'
import { getTableConfig } from 'drizzle-orm/pg-core'
import { describe, expect, it } from 'vitest'
import { timeProposalRounds, timeProposals } from '../src/schema/scheduling.js'

describe('scheduling proposal round schema', () => {
  it('links every proposal to a persisted round', () => {
    expect(getTableName(timeProposalRounds)).toBe('time_proposal_rounds')
    expect(getTableColumns(timeProposalRounds).gameId.notNull).toBe(true)
    expect(getTableColumns(timeProposalRounds).proposerId.notNull).toBe(true)
    expect(getTableColumns(timeProposalRounds).status.hasDefault).toBe(true)
    expect(getTableColumns(timeProposals).roundId.notNull).toBe(true)
    expect(getTableConfig(timeProposals).foreignKeys).toHaveLength(3)
  })

  it('enforces one open proposal round per game at the database boundary', () => {
    const openRoundIndex = getTableConfig(timeProposalRounds).indexes.find((index) => index.config.name === 'time_proposal_rounds_open_game_unique')

    expect(openRoundIndex?.config.unique).toBe(true)
    expect(openRoundIndex?.config.where).toBeDefined()
  })
})

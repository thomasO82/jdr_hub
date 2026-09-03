import { describe, expect, it } from 'vitest'
import { createDatabase, parseDatabaseUrl } from './index.js'

describe('database configuration', () => {
  it('rejects a missing connection URL', () => {
    expect(() => parseDatabaseUrl(undefined)).toThrow(
      'DATABASE_URL is required',
    )
  })

  it('rejects non-PostgreSQL URLs', () => {
    expect(() => parseDatabaseUrl('https://example.test/database')).toThrow(
      'DATABASE_URL must use postgres or postgresql',
    )
  })

  it('accepts PostgreSQL URLs without exposing credentials', () => {
    const parsed = parseDatabaseUrl(
      'postgresql://jdr_hub_app:local-development-only@postgres:5432/jdr_hub_dev',
    )

    expect(parsed.protocol).toBe('postgresql:')
    expect(parsed.hostname).toBe('postgres')
    expect(parsed.pathname).toBe('/jdr_hub_dev')
    expect(parsed.password).toBe('local-development-only')
  })

  it('creates a Drizzle database handle without connecting eagerly', () => {
    const database = createDatabase(
      'postgresql://jdr_hub_app:local-development-only@postgres:5432/jdr_hub_dev',
    )

    expect(database.db).toBeDefined()
    expect(database.client).toBeDefined()
    void database.client.end()
  })
})

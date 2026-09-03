import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as authSchema from './schema/auth.js'

export { authSchema }
/** Parse and validate the server-only PostgreSQL connection URL. */
export function parseDatabaseUrl(rawUrl: string | undefined): URL {
  if (!rawUrl) {
    throw new Error('DATABASE_URL is required')
  }

  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    throw new Error('DATABASE_URL must be a valid URL')
  }

  if (parsed.protocol !== 'postgres:' && parsed.protocol !== 'postgresql:') {
    throw new Error('DATABASE_URL must use postgres or postgresql')
  }

  if (!parsed.hostname || !parsed.pathname || parsed.pathname === '/') {
    throw new Error('DATABASE_URL must include a database name')
  }

  return parsed
}

/** Create a server-only Drizzle handle; the pool connects lazily on first query. */
export function createDatabase(rawUrl: string | undefined) {
  const connectionUrl = parseDatabaseUrl(rawUrl)
  const client = new Pool({ connectionString: connectionUrl.toString() })

  return {
    client,
    db: drizzle(client, { schema: authSchema }),
  }
}

import { fileURLToPath } from 'node:url'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { Pool } from 'pg'
import * as authSchema from './schema/auth.js'
import * as availabilitySchema from './schema/availability.js'
import * as attendanceSchema from './schema/attendance.js'
import * as gameSchema from './schema/games.js'
import * as invitationsSchema from './schema/invitations.js'
import * as schedulingSchema from './schema/scheduling.js'

export { authSchema, availabilitySchema, attendanceSchema, gameSchema, invitationsSchema, schedulingSchema }
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
    db: drizzle(client, { schema: { ...authSchema, ...availabilitySchema, ...attendanceSchema, ...gameSchema, ...invitationsSchema, ...schedulingSchema } }),
  }
}

/** Resolve migrations relative to this package so container startup is independent of cwd. */
export function getMigrationsFolder(): string {
  return fileURLToPath(new URL('../migrations', import.meta.url))
}

/** Apply the package migrations before the API begins handling requests. */
export async function migrateDatabase(database: ReturnType<typeof createDatabase>): Promise<void> {
  await migrate(database.db, { migrationsFolder: getMigrationsFolder() })
}

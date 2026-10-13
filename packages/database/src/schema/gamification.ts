import { sql } from 'drizzle-orm'
import { check, index, integer, pgTable, timestamp, unique, uuid, varchar } from 'drizzle-orm/pg-core'
import { users } from './auth.js'
import { schedulingSchema } from './scheduling.js'

const { gameSessions } = schedulingSchema

export const xpEvents = pgTable('xp_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  sessionId: uuid('session_id').references(() => gameSessions.id, { onDelete: 'cascade' }),
  amount: integer('amount').notNull(),
  reason: varchar('reason', { length: 64 }).notNull(),
  idempotencyKey: varchar('idempotency_key', { length: 256 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique('xp_events_idempotency_key_unique').on(table.idempotencyKey),
  index('xp_events_user_created_index').on(table.userId, table.createdAt, table.id),
  index('xp_events_session_id_index').on(table.sessionId),
  check('xp_events_amount_positive', sql`${table.amount} > 0`),
])

export const gamificationSchema = { xpEvents }

import { sql } from 'drizzle-orm'
import { index, pgTable, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core'
import { users } from './auth.js'
import { gameSchema } from './games.js'

const { games } = gameSchema

export const invitations = pgTable('invitations', {
  id: uuid('id').defaultRandom().primaryKey(),
  gameId: uuid('game_id').notNull().references(() => games.id, { onDelete: 'cascade' }),
  inviterId: uuid('inviter_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  inviteeId: uuid('invitee_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  status: varchar('status', { length: 16 }).notNull().default('PENDING'),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('invitations_game_id_index').on(table.gameId),
  index('invitations_invitee_id_index').on(table.inviteeId),
  index('invitations_expires_at_index').on(table.expiresAt),
  uniqueIndex('invitations_pending_game_invitee_unique').on(table.gameId, table.inviteeId).where(sql`"status" = 'PENDING'`),
])

export const invitationsSchema = { invitations }

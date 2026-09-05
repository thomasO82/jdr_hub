import {
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'
import { users } from './auth.js'
import { gameSchema } from './games.js'

const { games } = gameSchema

export const timeProposals = pgTable('time_proposals', {
  id: uuid('id').defaultRandom().primaryKey(),
  gameId: uuid('game_id').notNull().references(() => games.id, { onDelete: 'cascade' }),
  proposerId: uuid('proposer_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
  endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
  status: varchar('status', { length: 16 }).notNull().default('OPEN'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('time_proposals_game_start_index').on(table.gameId, table.startsAt),
  index('time_proposals_status_index').on(table.status),
])

export const timeVotes = pgTable('time_votes', {
  proposalId: uuid('proposal_id').notNull().references(() => timeProposals.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  vote: varchar('vote', { length: 8 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  primaryKey({ name: 'time_votes_proposal_user_pk', columns: [table.proposalId, table.userId] }),
  index('time_votes_user_index').on(table.userId),
])

export const gameSessions = pgTable('game_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  gameId: uuid('game_id').notNull().references(() => games.id, { onDelete: 'cascade' }),
  proposalId: uuid('proposal_id').references(() => timeProposals.id, { onDelete: 'set null' }),
  startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
  endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
  status: varchar('status', { length: 16 }).notNull().default('PROPOSED'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique('game_sessions_proposal_unique').on(table.proposalId),
  index('game_sessions_game_start_index').on(table.gameId, table.startsAt),
  index('game_sessions_status_index').on(table.status),
])

export const schedulingSchema = { timeProposals, timeVotes, gameSessions }

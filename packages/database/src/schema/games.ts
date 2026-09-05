import { index, integer, pgTable, primaryKey, timestamp, uuid, varchar, text, boolean } from 'drizzle-orm/pg-core'
import { users } from './auth.js'

export const games = pgTable('games', {
  id: uuid('id').defaultRandom().primaryKey(),
  ownerId: uuid('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  slug: varchar('slug', { length: 180 }).notNull().unique(),
  title: varchar('title', { length: 160 }).notNull(),
  system: varchar('system', { length: 100 }).notNull(),
  description: text('description').notNull(),
  type: varchar('type', { length: 16 }).notNull(),
  status: varchar('status', { length: 16 }).notNull().default('DRAFT'),
  visibility: varchar('visibility', { length: 16 }).notNull().default('PUBLIC'),
  maxPlayers: integer('max_players').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('games_owner_id_index').on(table.ownerId),
  index('games_title_index').on(table.title),
  index('games_status_visibility_index').on(table.status, table.visibility),
])

export const tags = pgTable('tags', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 64 }).notNull(),
  slug: varchar('slug', { length: 64 }).notNull().unique(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const gameTags = pgTable('game_tags', {
  gameId: uuid('game_id').notNull().references(() => games.id, { onDelete: 'cascade' }),
  tagId: uuid('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
}, (table) => [
  primaryKey({ columns: [table.gameId, table.tagId] }),
  index('game_tags_tag_id_index').on(table.tagId),
])

export const gameSchema = { games, tags, gameTags }

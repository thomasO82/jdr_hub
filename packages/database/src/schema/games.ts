import { index, integer, pgTable, primaryKey, timestamp, unique, uuid, varchar, text, boolean } from 'drizzle-orm/pg-core'
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

export const applications = pgTable('applications', {
  id: uuid('id').defaultRandom().primaryKey(),
  gameId: uuid('game_id').notNull().references(() => games.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  message: varchar('message', { length: 1_000 }),
  status: varchar('status', { length: 16 }).notNull().default('PENDING'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique('applications_game_user_unique').on(table.gameId, table.userId),
  index('applications_game_id_index').on(table.gameId),
  index('applications_user_id_index').on(table.userId),
  index('applications_status_index').on(table.status),
])

export const gameMembers = pgTable('game_members', {
  gameId: uuid('game_id').notNull().references(() => games.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 16 }).notNull().default('PLAYER'),
  status: varchar('status', { length: 16 }).notNull().default('ACTIVE'),
  joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.gameId, table.userId] }),
  index('game_members_user_id_index').on(table.userId),
  index('game_members_game_status_index').on(table.gameId, table.status),
])

export const gameSchema = { games, tags, gameTags, applications, gameMembers }

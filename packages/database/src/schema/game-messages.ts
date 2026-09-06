import { index, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'
import { users } from './auth.js'
import { games } from './games.js'

export const gameMessages = pgTable('game_messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  gameId: uuid('game_id')
    .notNull()
    .references(() => games.id, { onDelete: 'cascade' }),
  authorId: uuid('author_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  content: varchar('content', { length: 2_000 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (table) => [
  index('game_messages_game_created_id_index').on(
    table.gameId,
    table.createdAt,
    table.id,
  ),
])

export const gameMessagesSchema = { gameMessages }

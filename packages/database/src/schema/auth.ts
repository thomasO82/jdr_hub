import {
  index,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    discordId: varchar('discord_id', { length: 32 }).notNull().unique(),
    username: varchar('username', { length: 64 }).notNull(),
    avatarUrl: varchar('avatar_url', { length: 2_048 }),
    timezone: varchar('timezone', { length: 64 })
      .notNull()
      .default('Europe/Paris'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
)

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenDigest: varchar('token_digest', { length: 43 }).notNull().unique(),
    idleExpiresAt: timestamp('idle_expires_at', { withTimezone: true }).notNull(),
    absoluteExpiresAt: timestamp('absolute_expires_at', {
      withTimezone: true,
    }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('sessions_user_id_index').on(table.userId),
    index('sessions_expiry_index').on(
      table.idleExpiresAt,
      table.absoluteExpiresAt,
    ),
  ],
)

export const oauthLoginAttempts = pgTable(
  'oauth_login_attempts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    stateDigest: varchar('state_digest', { length: 43 }).notNull().unique(),
    codeVerifier: varchar('code_verifier', { length: 128 }).notNull(),
    returnTo: varchar('return_to', { length: 256 }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index('oauth_login_attempts_expiry_index').on(table.expiresAt)],
)

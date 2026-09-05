import {
  boolean,
  index,
  integer,
  pgTable,
  primaryKey,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'
import { users } from './auth.js'

export const availabilityRules = pgTable(
  'availability_rules',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    dayOfWeek: integer('day_of_week').notNull(),
    startMinute: integer('start_minute').notNull(),
    endMinute: integer('end_minute').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('availability_rules_user_day_index').on(table.userId, table.dayOfWeek)],
)

export const availabilityExceptions = pgTable(
  'availability_exceptions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
    label: varchar('label', { length: 120 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('availability_exceptions_user_start_index').on(table.userId, table.startsAt)],
)

export const userPreferences = pgTable('user_preferences', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  availabilityPublic: boolean('availability_public').notNull().default(false),
  invitationNotifications: boolean('invitation_notifications').notNull().default(true),
  experienceLevel: varchar('experience_level', { length: 20 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const userPreferredSystems = pgTable(
  'user_preferred_systems',
  {
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    system: varchar('system', { length: 100 }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.system] })],
)

export const availabilitySchema = {
  availabilityRules,
  availabilityExceptions,
  userPreferences,
  userPreferredSystems,
}

import {
  index,
  integer,
  pgTable,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'
import { users } from './auth.js'
import { gameSchema } from './games.js'
import { schedulingSchema } from './scheduling.js'

const { games } = gameSchema
const { gameSessions } = schedulingSchema

export const sessionAttendance = pgTable('session_attendance', {
  id: uuid('id').defaultRandom().primaryKey(),
  sessionId: uuid('session_id').notNull().references(() => gameSessions.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  status: varchar('status', { length: 16 }).notNull().default('PENDING'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique('session_attendance_session_user_unique').on(table.sessionId, table.userId),
  index('session_attendance_session_status_index').on(table.sessionId, table.status),
  index('session_attendance_user_index').on(table.userId),
])

export const notifications = pgTable('notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  type: varchar('type', { length: 32 }).notNull(),
  recipientId: uuid('recipient_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  gameId: uuid('game_id').notNull().references(() => games.id, { onDelete: 'cascade' }),
  sessionId: uuid('session_id').notNull().references(() => gameSessions.id, { onDelete: 'cascade' }),
  actorId: uuid('actor_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 160 }).notNull(),
  body: varchar('body', { length: 500 }).notNull(),
  logicalKey: varchar('logical_key', { length: 160 }).notNull(),
  readAt: timestamp('read_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique('notifications_logical_key_unique').on(table.logicalKey),
  index('notifications_recipient_created_index').on(table.recipientId, table.createdAt),
  index('notifications_unread_index').on(table.recipientId, table.readAt),
])

export const notificationDeliveries = pgTable('notification_deliveries', {
  id: uuid('id').defaultRandom().primaryKey(),
  notificationId: uuid('notification_id').notNull().references(() => notifications.id, { onDelete: 'cascade' }),
  channel: varchar('channel', { length: 16 }).notNull(),
  status: varchar('status', { length: 16 }).notNull().default('PENDING'),
  attempts: integer('attempts').notNull().default(0),
  processingAt: timestamp('processing_at', { withTimezone: true }),
  nextAttemptAt: timestamp('next_attempt_at', { withTimezone: true }),
  providerMessageId: varchar('provider_message_id', { length: 128 }),
  lastErrorCode: varchar('last_error_code', { length: 64 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  unique('notification_deliveries_notification_channel_unique').on(table.notificationId, table.channel),
  index('notification_deliveries_status_retry_index').on(table.status, table.nextAttemptAt),
])

export const attendanceSchema = { sessionAttendance, notifications, notificationDeliveries }

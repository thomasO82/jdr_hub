import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { getTableColumns, getTableName } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { notificationDeliveries, notifications, sessionAttendance } from '../src/schema/attendance.js'

const migrationPath = resolve(import.meta.dirname, '../migrations/0006_attendance_notifications.sql')
const processingMigrationPath = resolve(import.meta.dirname, '../migrations/0007_equal_hedge_knight.sql')

describe('attendance and notification database schema', () => {
  it('defines attendance, in-app notification and Discord delivery tables', () => {
    expect(getTableName(sessionAttendance)).toBe('session_attendance')
    expect(getTableName(notifications)).toBe('notifications')
    expect(getTableName(notificationDeliveries)).toBe('notification_deliveries')
    expect(getTableColumns(sessionAttendance).sessionId.notNull).toBe(true)
    expect(getTableColumns(sessionAttendance).userId.notNull).toBe(true)
    expect(getTableColumns(notifications).recipientId.notNull).toBe(true)
    expect(getTableColumns(notificationDeliveries).notificationId.notNull).toBe(true)
  })

  it('uses bounded statuses and safe defaults', () => {
    expect(getTableColumns(sessionAttendance).status.hasDefault).toBe(true)
    expect(getTableColumns(notifications).readAt.notNull).toBe(false)
    expect(getTableColumns(notificationDeliveries).status.hasDefault).toBe(true)
    expect(getTableColumns(notificationDeliveries).attempts.hasDefault).toBe(true)
    expect(getTableColumns(notificationDeliveries).processingAt.notNull).toBe(false)
    expect(getTableColumns(notificationDeliveries).lastErrorCode.notNull).toBe(false)
  })

  it('contains additive migration statements and idempotency constraints', () => {
    const migration = readFileSync(migrationPath, 'utf8')
    const processingMigration = readFileSync(processingMigrationPath, 'utf8')
    expect(migration).toContain('CREATE TABLE "session_attendance"')
    expect(migration).toContain('CREATE TABLE "notifications"')
    expect(migration).toContain('CREATE TABLE "notification_deliveries"')
    expect(migration).toContain('session_attendance_session_user_unique')
    expect(migration).toContain('notifications_logical_key_unique')
    expect(migration).toContain('notification_deliveries_notification_channel_unique')
    expect(processingMigration).toContain('processing_at')
    expect(migration).toContain('session_attendance_session_status_index')
    expect(migration).not.toMatch(/\bDROP\s+(TABLE|COLUMN|INDEX)\b/i)
  })
})

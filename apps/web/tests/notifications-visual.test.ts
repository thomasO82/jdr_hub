import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('notification visual components', () => {
  it('provides an accessible bell, panel and French loading/empty/error states', () => {
    const source = readFileSync(resolve(import.meta.dirname, '../features/notifications/notification-bell.tsx'), 'utf8') + readFileSync(resolve(import.meta.dirname, '../features/notifications/notification-panel.tsx'), 'utf8')
    expect(source).toContain("'use client'")
    expect(source).toContain('aria-expanded')
    expect(source).toContain('role="status"')
    expect(source).toContain('Aucune notification')
    expect(source).toContain('Réessayer')
    expect(source).toContain('Notifications')
  })

  it('keeps the panel on the existing visual tokens and supports keyboard focus', () => {
    const source = readFileSync(resolve(import.meta.dirname, '../features/notifications/notification-panel.tsx'), 'utf8')
    expect(source).toContain('bg-surface')
    expect(source).toContain('border-outline-variant')
    expect(source).toContain('focus-visible:')
    expect(source).not.toContain('style={{')
  })
})

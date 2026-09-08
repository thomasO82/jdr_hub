import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const web = resolve(import.meta.dirname, '..')

describe('dashboard visual composition', () => {
  it('places the notification summary in the desktop secondary column and after the next session on mobile', () => {
    const source = readFileSync(resolve(web, 'features/dashboard/dashboard-view.tsx'), 'utf8')

    expect(source).toContain('NotificationSummary')
    expect(source).toContain('lg:grid-cols-[minmax(0,1fr)_320px]')
    expect(source).toContain('nextSession')
  })

  it('renders the notification summary only for unread notifications', () => {
    const source = readFileSync(resolve(web, 'features/notifications/notification-summary.tsx'), 'utf8')

    expect(source).toContain('summary.unreadCount <= 0')
    expect(source).toContain('Marquer comme lue')
  })

  it('keeps the shell bell as the global history entry point', () => {
    const source = readFileSync(resolve(web, 'features/layout/app-shell.tsx'), 'utf8')

    expect(source.match(/<NotificationBell/g)?.length).toBeGreaterThanOrEqual(2)
    expect(source).toContain('lg:ml-64')
    expect(source).toContain('hidden h-16')
  })
})

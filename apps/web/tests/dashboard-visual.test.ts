import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')
const web = resolve(import.meta.dirname, '..')

describe('dashboard visual structure', () => {
  it('matches the authenticated shell hierarchy and responsive dashboard states', () => {
    const view = read('../features/dashboard/dashboard-view.tsx')
    const block = read('../features/dashboard/dashboard-block.tsx')
    expect(view).toContain('<AppShell')
    expect(view).toContain('Prochaine séance')
    expect(view).toContain('Parties actives')
    expect(view).toContain('lg:grid-cols')
    expect(view).toContain('md:grid-cols')
    expect(view).toContain('font-display')
    expect(block).toContain('Réessayer')
    expect(block).toContain('role="alert"')
    expect(block).toContain('role="status"')
    expect(`${view}\n${block}`).toContain('focus-visible:')
    expect(`${view}\n${block}`).not.toContain('style={{')
  })

  it('renders the notification summary only for unread notifications', () => {
    const view = read('../features/dashboard/dashboard-view.tsx')
    const summary = read('../features/notifications/notification-summary.tsx')
    expect(view).toContain('NotificationSummary')
    expect(view).toContain('dashboard?.notifications.status === \'READY\'')
    expect(summary).toContain('summary.unreadCount <= 0')
    expect(summary).toContain('Marquer comme lue')
  })

  it('keeps the shell bell as the global history entry point above the content', () => {
    const source = readFileSync(resolve(web, 'features/layout/app-shell.tsx'), 'utf8')
    expect(source.match(/<NotificationBell/g)?.length).toBeGreaterThanOrEqual(2)
    expect(source).toContain('lg:ml-64')
    expect(source).toContain('hidden h-16')
  })

  it('keeps the root route as a route composition for the dashboard', () => {
    const page = read('../app/page.tsx')
    expect(page).toContain('redirect')
    expect(page).not.toContain('HomeView')
  })
})

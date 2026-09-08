import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const web = resolve(import.meta.dirname, '..')

describe('dashboard page composition', () => {
  it('provides a private dashboard route and keeps the root as its entry point', () => {
    const dashboardPage = readFileSync(resolve(web, 'app/dashboard/page.tsx'), 'utf8')
    const rootPage = readFileSync(resolve(web, 'app/page.tsx'), 'utf8')

    expect(dashboardPage).toContain('DashboardView')
    expect(rootPage).toContain('/dashboard')
  })

  it('points the shared shell dashboard navigation to the private route', () => {
    const shell = readFileSync(resolve(web, 'features/layout/app-shell.tsx'), 'utf8')
    expect(shell).toContain("href: '/dashboard'")
  })
})

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')

describe('availability visual structure', () => {
  it('uses the shared shell and Tailwind responsive layout', () => {
    const view = read('../features/availability/availability-view.tsx')
    expect(view).toContain('<AppShell')
    expect(view).toContain('lg:grid-cols')
    expect(view).toContain('rounded-xl')
    expect(view).not.toContain('style=')
  })

  it('lets each day be enabled before editing its hours', () => {
    const grid = read('../features/availability/availability-grid.tsx')
    expect(grid).toContain('type="checkbox"')
    expect(grid).toContain('disabled={!rule}')
    expect(grid).toContain('onChange={(event) => toggleDay')
  })
})

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('planning visual shell', () => {
  it('uses Tailwind responsive calendar and agenda classes', () => {
    const source = readFileSync(resolve(import.meta.dirname, '../features/planning/planning-view.tsx'), 'utf8') + readFileSync(resolve(import.meta.dirname, '../features/planning/month-calendar.tsx'), 'utf8')
    expect(source).toContain('lg:grid-cols')
    expect(source).toContain('grid-cols-7')
    expect(source).toContain('Prochaines Séances')
    expect(source).toContain('aria-label')
  })

  it('exposes keyboard-friendly planning controls and reduced-motion states', () => {
    const view = readFileSync(resolve(import.meta.dirname, '../features/planning/planning-view.tsx'), 'utf8')
    const card = readFileSync(resolve(import.meta.dirname, '../features/planning/session-card.tsx'), 'utf8')
    const page = readFileSync(resolve(import.meta.dirname, '../app/planning/page.tsx'), 'utf8')

    expect(`${view}\n${page}`).toContain('active="Planning"')
    expect(`${view}\n${card}`).toContain('min-h-12')
    expect(`${view}\n${card}`).toContain('motion-reduce:transition-none')
    expect(view).toContain('aria-selected')
    expect(view).toContain('aria-describedby')
    expect(page).toContain('role="alert"')
    expect(page).toContain('role="status"')
  })
})

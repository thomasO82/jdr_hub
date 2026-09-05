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
})

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const pagePath = resolve(import.meta.dirname, '../app/planning/page.tsx')

describe('planning page structure', () => {
  it('uses the shared shell and planning view', () => {
    const source = readFileSync(pagePath, 'utf8')
    expect(source).toContain("features/layout/app-shell")
    expect(source).toContain('PlanningView')
  })
})

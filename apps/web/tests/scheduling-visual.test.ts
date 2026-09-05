import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('vote visual shell', () => {
  it('contains desktop matrix and mobile proposal cards', () => {
    const source = readFileSync(resolve(import.meta.dirname, '../features/scheduling/proposal-vote-view.tsx'), 'utf8') + readFileSync(resolve(import.meta.dirname, '../features/scheduling/proposal-matrix.tsx'), 'utf8')
    expect(source).toContain('Créneaux Proposés')
    expect(source).toContain('md:hidden')
    expect(source).toContain('md:block')
    expect(source).toContain('aria-label')
  })
})

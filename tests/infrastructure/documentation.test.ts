import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '../..')

describe('F00 traceability documentation', () => {
  it('documents reproducible startup and observed verification evidence', () => {
    expect(existsSync(resolve(root, 'README.md'))).toBe(true)

    const feature = readFileSync(
      resolve(root, 'docs/features/001-monorepo-foundation.md'),
      'utf8',
    )
    const status = readFileSync(resolve(root, 'docs/project-status.md'), 'utf8')

    expect(feature).toContain('fix/f00-hardening')
    expect(feature).toContain('pnpm audit --audit-level=high')
    expect(feature).toContain('Preuve TDD Red, Green, Refactor')
    expect(feature).toContain('Contrôles de sécurité')
    expect(status).toContain('fix/f00-hardening')
    expect(status).toContain('IN_PROGRESS')
  })
})

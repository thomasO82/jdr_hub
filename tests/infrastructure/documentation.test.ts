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

describe('F07B traceability documentation', () => {
  it('documents the in-app game chat and its authorization boundary', () => {
    const feature = readFileSync(
      resolve(root, 'docs/features/015-game-messaging.md'),
      'utf8',
    )
    const status = readFileSync(resolve(root, 'docs/project-status.md'), 'utf8')
    const matrix = readFileSync(
      resolve(root, 'docs/security/authorization-matrix.md'),
      'utf8',
    )

    expect(feature).toContain('feat/game-messaging')
    expect(feature).toContain('Preuve TDD Red, Green, Refactor')
    expect(feature).toContain('Contrôles de sécurité')
    expect(feature).toContain('SSE')
    expect(feature).toContain('Redis Streams')
    expect(status).toContain('F07B')
    expect(status).toContain('feat/game-messaging')
    expect(matrix).toContain('Lire les messages d’une partie')
    expect(matrix).toContain('Écrire un message dans une partie')
  })
})

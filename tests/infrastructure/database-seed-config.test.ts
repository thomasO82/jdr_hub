import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '../..')

describe('database seed command', () => {
  it('loads the root environment file when run through pnpm', () => {
    const packageJson = JSON.parse(
      readFileSync(resolve(root, 'packages/database/package.json'), 'utf8'),
    ) as { scripts?: Record<string, string> }

    expect(packageJson.scripts?.['db:seed']).toContain(
      '--env-file-if-exists=../../.env',
    )
  })
})

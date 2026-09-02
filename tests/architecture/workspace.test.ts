import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

describe('workspace boundaries', () => {
  it('declares the application and package workspaces', () => {
    const workspace = readFileSync(resolve(root, 'pnpm-workspace.yaml'), 'utf8')
    expect(workspace).toContain('apps/*')
    expect(workspace).toContain('packages/*')
    expect(existsSync(resolve(root, 'apps/web'))).toBe(true)
    expect(existsSync(resolve(root, 'apps/api'))).toBe(true)
    expect(existsSync(resolve(root, 'packages/shared'))).toBe(true)
    expect(existsSync(resolve(root, 'packages/database'))).toBe(true)
  })
})

import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const repositoryRoot = fileURLToPath(new URL('../..', import.meta.url))

function runMake(...args: string[]) {
  return spawnSync('make', args, { cwd: repositoryRoot, encoding: 'utf8' })
}

describe('developer Makefile commands', () => {
  it('documents the common project commands in help', () => {
    const result = runMake('help')

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('up')
    expect(result.stdout).toContain('test-integration')
    expect(result.stdout).toContain('db-studio')
  })

  it('rebuilds and waits for the development stack with make up', () => {
    const result = runMake('-n', 'up')

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('pnpm dev:rebuild')
  })

  it('stops the development stack without deleting its database volume', () => {
    const result = runMake('-n', 'down')

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('pnpm dev:down')
    expect(result.stdout).not.toContain('-v')
  })

  it('exposes the repository integration test command through make', () => {
    const result = runMake('-n', 'test-integration')

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('pnpm test:integration')
  })
})

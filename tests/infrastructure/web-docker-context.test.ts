import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

describe('web Docker build context', () => {
  it('copies the shared package source before building Next.js', () => {
    const dockerfile = readFileSync(resolve(root, 'apps/web/Dockerfile'), 'utf8')

    expect(dockerfile).toContain('COPY packages/shared packages/shared')
    expect(dockerfile).toContain('RUN pnpm --filter @jdr-hub/shared build')

    const sharedBuild = dockerfile.indexOf(
      'RUN pnpm --filter @jdr-hub/shared build',
    )
    const webBuild = dockerfile.indexOf('RUN pnpm --filter @jdr-hub/web build')
    expect(sharedBuild).toBeGreaterThan(-1)
    expect(webBuild).toBeGreaterThan(sharedBuild)
  })
})

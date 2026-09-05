import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { hasServerDatabaseImport } from './helpers/database-boundary.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

describe('package boundaries', () => {
  it('provides stable shared and server database package entrypoints', () => {
    const sharedManifest = resolve(root, 'packages/shared/package.json')
    const databaseManifest = resolve(root, 'packages/database/package.json')

    expect(existsSync(sharedManifest)).toBe(true)
    expect(existsSync(databaseManifest)).toBe(true)
    expect(JSON.parse(readFileSync(sharedManifest, 'utf8'))).toMatchObject({
      name: '@jdr-hub/shared',
    })
    expect(JSON.parse(readFileSync(databaseManifest, 'utf8'))).toMatchObject({
      name: '@jdr-hub/database',
    })
  })

  it('detects server database imports in browser source', () => {
    for (const source of [
      "import { db } from '@jdr-hub/database'",
      "import { db } from 'packages/database'",
      "import { drizzle } from 'drizzle-orm'",
    ]) {
      expect(hasServerDatabaseImport(source)).toBe(true)
    }
    expect(hasServerDatabaseImport('import { health } from "@jdr-hub/shared"'))
      .toBe(false)
  })
})

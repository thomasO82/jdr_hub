import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

function sourceFilesUnder(directory: string): string[] {
  if (!existsSync(directory)) return []

  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name)
    if (entry.isDirectory()) return sourceFilesUnder(path)
    return /\.(mjs|cjs|js|jsx|ts|tsx)$/.test(entry.name) ? [path] : []
  })
}

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

  it('does not import server database code into browser source directories', () => {
    const browserDirectories = ['app', 'components', 'features'].map((name) =>
      resolve(root, 'apps/web', name),
    )

    for (const sourceFile of browserDirectories.flatMap(sourceFilesUnder)) {
      const source = readFileSync(sourceFile, 'utf8')
      expect(source).not.toMatch(
        /@jdr-hub\/database|packages\/database|drizzle-orm/,
      )
    }
  })
})

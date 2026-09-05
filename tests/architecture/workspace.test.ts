import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  browserSourceFiles,
  hasServerDatabaseImport,
} from './helpers/database-boundary.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

const dependencySections = [
  'dependencies',
  'devDependencies',
  'optionalDependencies',
  'peerDependencies',
] as const

function workspacePackageManifests(): string[] {
  return [
    resolve(root, 'package.json'),
    ...['apps', 'packages'].flatMap((workspace) =>
      readdirSync(resolve(root, workspace), { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => resolve(root, workspace, entry.name, 'package.json')),
    ),
  ].filter((manifest) => existsSync(manifest))
}

describe('workspace boundaries', () => {
  it('delegates quality scripts to every workspace', () => {
    const rootPackage = JSON.parse(
      readFileSync(resolve(root, 'package.json'), 'utf8'),
    ) as { scripts?: Record<string, string> }

    expect(rootPackage.scripts?.lint).toMatch(/pnpm .* -r run lint/)
    expect(rootPackage.scripts?.typecheck).toMatch(/pnpm .* -r run typecheck/)
  })

  it('declares the application and package workspaces', () => {
    const workspace = readFileSync(resolve(root, 'pnpm-workspace.yaml'), 'utf8')
    expect(workspace).toContain('apps/*')
    expect(workspace).toContain('packages/*')
    expect(existsSync(resolve(root, 'apps/web'))).toBe(true)
    expect(existsSync(resolve(root, 'apps/api'))).toBe(true)
    expect(existsSync(resolve(root, 'packages/shared'))).toBe(true)
    expect(existsSync(resolve(root, 'packages/database'))).toBe(true)
  })

  it('does not declare dependencies through local path specifiers', () => {
    for (const manifest of workspacePackageManifests()) {
      const packageJson = JSON.parse(readFileSync(manifest, 'utf8')) as Record<
        string,
        unknown
      >

      for (const section of dependencySections) {
        const dependencies = packageJson[section]
        if (!dependencies || typeof dependencies !== 'object') continue

        for (const version of Object.values(dependencies)) {
          expect(version).not.toMatch(/^(file|link):/)
        }
      }
    }
  })

  it('keeps server database code out of browser source directories', () => {
    const imports = browserSourceFiles(root)
      .map((file) => readFileSync(file, 'utf8'))
      .join('\n')

    expect(hasServerDatabaseImport(imports)).toBe(false)
  })
})

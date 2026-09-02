import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

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

function frontendSourceFiles(directory: string): string[] {
  if (!existsSync(directory)) return []

  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name)
    if (entry.isDirectory()) return frontendSourceFiles(path)
    if (!statSync(path).isFile() || !/\.(tsx?|jsx?)$/.test(entry.name)) return []
    return [path]
  })
}

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
          expect(version).not.toMatch(/^(file|link|workspace):/)
        }
      }
    }
  })

  it('keeps server database code out of browser source directories', () => {
    const imports = ['apps/web/app', 'apps/web/components', 'apps/web/features']
      .flatMap((directory) => frontendSourceFiles(resolve(root, directory)))
      .map((file) => readFileSync(file, 'utf8'))
      .join('\n')

    expect(imports).not.toMatch(/@jdr-hub\/database|packages\/database|drizzle-orm/)
  })
})

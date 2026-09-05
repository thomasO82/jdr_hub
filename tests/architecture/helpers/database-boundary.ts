import { existsSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

const browserSourceDirectoryNames = ['app', 'components', 'features']

export function browserSourceFiles(root: string): string[] {
  return browserSourceDirectoryNames.flatMap((directory) =>
    sourceFilesUnder(resolve(root, 'apps/web', directory)),
  )
}

export function hasServerDatabaseImport(source: string): boolean {
  return /@jdr-hub\/database|packages\/database|drizzle-orm/.test(source)
}

function sourceFilesUnder(directory: string): string[] {
  if (!existsSync(directory)) return []

  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name)
    if (entry.isDirectory()) return sourceFilesUnder(path)
    return /\.(mjs|cjs|js|jsx|ts|tsx)$/.test(entry.name) ? [path] : []
  })
}

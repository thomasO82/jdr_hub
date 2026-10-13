import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const webRoot = resolve(import.meta.dirname, '..')

function read(relativePath: string): string {
  return readFileSync(join(webRoot, relativePath), 'utf8')
}

function findCssModules(directory: string): string[] {
  const found: string[] = []
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === '.next' || entry.name === 'node_modules') continue
    const path = join(directory, entry.name)
    if (entry.isDirectory()) found.push(...findCssModules(path))
    else if (entry.name.endsWith('.module.css')) found.push(path)
  }
  return found
}

function findFiles(directory: string, extension: string): string[] {
  const found: string[] = []
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === '.next' || entry.name === 'node_modules') continue
    const path = join(directory, entry.name)
    if (entry.isDirectory()) found.push(...findFiles(path, extension))
    else if (entry.name.endsWith(extension)) found.push(path)
  }
  return found
}

describe('Tailwind-only frontend architecture', () => {
  it('uses one global Tailwind entrypoint and no CSS modules', () => {
    expect(existsSync(join(webRoot, 'app/globals.css'))).toBe(true)
    expect(read('app/globals.css')).toContain('@import "tailwindcss"')
    expect(read('app/layout.tsx')).toContain("./globals.css")
    expect(findCssModules(webRoot)).toEqual([])
  })

  it('defines the project tokens and Tailwind PostCSS plugin', () => {
    expect(read('app/globals.css')).toContain('--color-primary: #630ed4')
    expect(read('app/globals.css')).toContain('--font-display:')
    expect(read('app/globals.css')).toContain('--font-body:')
    expect(read('app/globals.css')).toContain('--font-label:')
    expect(read('postcss.config.mjs')).toContain("'@tailwindcss/postcss'")
  })

  it('keeps all component styling in Tailwind classes', () => {
    expect(findFiles(webRoot, '.css')).toEqual([join(webRoot, 'app/globals.css')])
    const sourceFiles = [...findFiles(join(webRoot, 'app'), '.tsx'), ...findFiles(join(webRoot, 'features'), '.tsx')]
    expect(sourceFiles.some((path) => readFileSync(path, 'utf8').includes('style={{'))).toBe(false)
  })
})

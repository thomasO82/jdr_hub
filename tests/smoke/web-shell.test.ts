import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const web = resolve(dirname(fileURLToPath(import.meta.url)), '../../apps/web')

describe('web shell', () => {
  it('has a server page and the official logo asset', () => {
    const page = readFileSync(resolve(web, 'app/page.tsx'), 'utf8')
    expect(existsSync(resolve(web, 'public/branding/logo.svg'))).toBe(true)
    expect(page).toContain('<main')
    expect(page).not.toContain('dangerouslySetInnerHTML')
  })
})

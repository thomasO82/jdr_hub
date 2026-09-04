import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const web = resolve(dirname(fileURLToPath(import.meta.url)), '..')

describe('web shell', () => {
  it('has a server page and the official logo asset', () => {
    const page = readFileSync(resolve(web, 'app/page.tsx'), 'utf8')
    const view = readFileSync(resolve(web, 'features/home/home-view.tsx'), 'utf8')
    const logo = resolve(web, 'public/branding/logo.svg')

    expect(existsSync(logo)).toBe(true)
    expect(view).toContain('/branding/logo.svg')
    expect(readFileSync(logo)).toEqual(
      readFileSync(resolve(web, '../../docs/branding/logo.svg')),
    )
    expect(view).toContain('<main')
    expect(view).not.toContain('dangerouslySetInnerHTML')
  })
})

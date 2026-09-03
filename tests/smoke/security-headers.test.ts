import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '../..')

describe('web security headers', () => {
  it('declares a restrictive baseline in Next configuration', () => {
    const config = readFileSync(resolve(root, 'apps/web/next.config.mjs'), 'utf8')

    expect(config).toContain('async headers()')
    expect(config).toContain('Content-Security-Policy')
    expect(config).toContain("default-src 'self'")
    expect(config).toContain("X-Content-Type-Options")
    expect(config).toContain('Referrer-Policy')
    expect(config).toContain('frame-ancestors \'none\'')
  })
})

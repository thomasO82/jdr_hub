import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '../..')

describe('same-origin routing', () => {
  it('routes the web root and API prefix through one published proxy', () => {
    const caddyPath = resolve(root, 'docker/Caddyfile')
    const compose = readFileSync(resolve(root, 'docker-compose.yml'), 'utf8')

    expect(existsSync(caddyPath)).toBe(true)
    const caddy = readFileSync(caddyPath, 'utf8')
    expect(caddy).toContain('handle_path /api/*')
    expect(caddy).toContain('reverse_proxy api-hono:8787')
    expect(caddy).toContain('reverse_proxy web-next:3000')
    expect(caddy).toContain('max_size 1MB')
    expect(compose).toContain('proxy-caddy:')
    expect(compose).toMatch(/proxy-caddy:[\s\S]*?ports:/)
    expect(compose).toMatch(/127\.0\.0\.1:18080:8080/)
    expect(compose).not.toMatch(/postgres:[\s\S]*?ports:/)
  })
})

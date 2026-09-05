import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

describe('JWT API Compose configuration', () => {
  it('requires the server-only signing key without passing it to the web service', () => {
    const compose = readFileSync(resolve(root, 'docker-compose.yml'), 'utf8')
    const apiService = compose.match(/^  api-hono:\n[\s\S]*?(?=^  [a-z-]+:|\Z)/m)?.[0] ?? ''
    const webService = compose.match(/^  web-next:\n[\s\S]*?(?=^  [a-z-]+:|\Z)/m)?.[0] ?? ''

    expect(apiService).toContain('JWT_SIGNING_SECRET:')
    expect(webService).not.toContain('JWT_SIGNING_SECRET:')
  })
})

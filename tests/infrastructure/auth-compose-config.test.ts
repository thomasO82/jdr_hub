import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const compose = readFileSync(resolve(root, 'docker-compose.yml'), 'utf8')

describe('F01 API Compose configuration', () => {
  it('provides the API with only server-side auth configuration and waits for PostgreSQL', () => {
    const apiService = compose.match(/^  api-hono:\n[\s\S]*?(?=^  [a-z-]+:|\Z)/m)?.[0] ?? ''

    expect(apiService).toContain('DATABASE_URL:')
    expect(apiService).toContain('APP_ORIGIN:')
    expect(apiService).toContain('DISCORD_CLIENT_ID:')
    expect(apiService).toContain('DISCORD_CLIENT_SECRET:')
    expect(apiService).toContain('DISCORD_REDIRECT_URI:')
    expect(apiService).toMatch(/depends_on:\n\s+postgres:\n\s+condition: service_healthy/)
  })
})

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '../..')

describe('developer Docker scripts', () => {
  it('provides short commands for the local stack and seed', () => {
    const packageJson = JSON.parse(
      readFileSync(resolve(root, 'package.json'), 'utf8'),
    ) as { scripts?: Record<string, string> }
    const scripts = packageJson.scripts ?? {}

    expect(scripts['dev:up']).toBe('docker compose -f docker-compose.yml up -d --wait')
    expect(scripts['dev:rebuild']).toBe('docker compose -f docker-compose.yml up -d --build --wait')
    expect(scripts['build:recreate']).toBe('docker compose -f docker-compose.yml up -d --build --force-recreate --wait')
    expect(scripts['db:seed']).toBe('docker compose -f docker-compose.yml run --rm api-hono node node_modules/@jdr-hub/database/dist/seed-cli.js')
    expect(scripts['dev:down']).toBe('docker compose -f docker-compose.yml down')
  })
})

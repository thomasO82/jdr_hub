import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '../..')

describe('Drizzle Studio development service', () => {
  it('declares the short Studio command', () => {
    const packageJson = JSON.parse(
      readFileSync(resolve(root, 'package.json'), 'utf8'),
    ) as { scripts?: Record<string, string> }

    expect(packageJson.scripts?.['db:studio']).toBe(
      'docker compose --profile tools up --build db-studio',
    )
  })

  it('keeps Studio local while connecting through the private database network', () => {
    const compose = readFileSync(resolve(root, 'docker-compose.yml'), 'utf8')
    const service = compose.match(/^  db-studio:\n[\s\S]*?(?=^  [a-z-]+:|\Z)/m)?.[0] ?? ''

    expect(service).not.toBe('')
    expect(service).toContain('profiles:')
    expect(service).toContain('- tools')
    expect(service).toContain('127.0.0.1:4983:4983')
    expect(service).toContain('- application')
    expect(service).toContain('database-internal')
    expect(service).toContain('condition: service_healthy')
  })

  it('configures Drizzle with the container database URL', () => {
    const config = readFileSync(
      resolve(root, 'packages/database/drizzle.config.ts'),
      'utf8',
    )

    expect(config).toContain('dbCredentials')
    expect(config).toContain('process.env.DATABASE_URL')
  })

  it('builds Studio from the workspace with a non-root user', () => {
    const dockerfile = readFileSync(
      resolve(root, 'docker/db-studio/Dockerfile'),
      'utf8',
    )

    expect(dockerfile).toMatch(/^FROM node:[^\n]+@sha256:[0-9a-f]{64}/m)
    expect(dockerfile).toContain('COPY packages/database packages/database')
    expect(dockerfile).toContain('COPY packages/shared packages/shared')
    expect(dockerfile).toContain('"./node_modules/.bin/drizzle-kit", "studio"')
    expect(dockerfile).toContain('USER node')
  })
})

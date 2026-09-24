import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '../..')

describe('developer Docker commands', () => {
  it('provides Make targets for the local stack and seed', () => {
    const makefile = readFileSync(resolve(root, 'Makefile'), 'utf8')

    expect(makefile).toContain('up:\n\t$(COMPOSE) up -d --wait')
    expect(makefile).toContain('rebuild:\n\t$(COMPOSE) up -d --build --wait')
    expect(makefile).toContain(
      'recreate:\n\t$(COMPOSE) up -d --build --force-recreate --wait',
    )
    expect(makefile).toContain(
      'seed:\n\t$(COMPOSE) run --rm api-hono node node_modules/@jdr-hub/database/dist/seed-cli.js',
    )
    expect(makefile).toContain(
      'studio:\n\t$(COMPOSE) --profile tools up --build db-studio',
    )
    expect(makefile).toContain('down:\n\t$(COMPOSE) down')
  })

  it('keeps Docker lifecycle commands out of package scripts', () => {
    const packageJson = JSON.parse(
      readFileSync(resolve(root, 'package.json'), 'utf8'),
    ) as { scripts?: Record<string, string> }
    const scripts = packageJson.scripts ?? {}

    expect(scripts['dev:up']).toBeUndefined()
    expect(scripts['dev:rebuild']).toBeUndefined()
    expect(scripts['build:recreate']).toBeUndefined()
    expect(scripts['db:seed']).toBeUndefined()
    expect(scripts['db:studio']).toBeUndefined()
    expect(scripts['dev:down']).toBeUndefined()
  })
})

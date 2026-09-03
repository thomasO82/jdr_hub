import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const composePath = resolve(root, 'docker-compose.yml')

function composeSource(): string {
  expect(existsSync(composePath), 'docker-compose.yml must exist').toBe(true)
  return readFileSync(composePath, 'utf8')
}

function indentedBlock(source: string, key: string, indentation: number): string {
  const lines = source.split('\n')
  const declaration = `${' '.repeat(indentation)}${key}:`
  const start = lines.findIndex((line) => line === declaration)

  if (start === -1) return ''

  const block: string[] = []
  for (const line of lines.slice(start + 1)) {
    const currentIndentation = line.search(/\S/)
    if (currentIndentation !== -1 && currentIndentation <= indentation) break
    block.push(line)
  }

  return block.join('\n')
}

function topLevelBlock(source: string, key: string): string {
  return indentedBlock(source, key, 0)
}

function serviceBlock(source: string, service: string): string {
  return indentedBlock(topLevelBlock(source, 'services'), service, 2)
}

describe('secure Docker Compose foundation', () => {
  it.each(['web-next', 'api-hono', 'postgres'])(
    'declares the %s service',
    (service) => {
      expect(serviceBlock(composeSource(), service)).not.toBe('')
    },
  )

  it('keeps PostgreSQL private and health checked', () => {
    const postgres = serviceBlock(composeSource(), 'postgres')

    expect(postgres).not.toMatch(/^ {4}ports:/m)
    expect(postgres).toMatch(/^ {4}healthcheck:/m)
  })

  it('isolates database traffic on an internal network', () => {
    const networks = topLevelBlock(composeSource(), 'networks')

    expect(networks).toMatch(/^  database-internal:/m)
    expect(networks).toMatch(/^ {4}internal: true$/m)
  })

  it('hardens every runtime service and pins base images', () => {
    const compose = composeSource()

    for (const service of ['proxy-caddy', 'web-next', 'api-hono', 'postgres']) {
      const block = serviceBlock(compose, service)
      expect(block).toMatch(/^ {4}security_opt:/m)
      expect(block).toMatch(/no-new-privileges:true/)
    }

    for (const dockerfile of ['apps/web/Dockerfile', 'apps/api/Dockerfile']) {
      const source = readFileSync(resolve(root, dockerfile), 'utf8')
      expect(source).toMatch(/^FROM node:[^\n]+@sha256:[0-9a-f]{64}/m)
      expect(source).toContain('USER node')
    }

    expect(compose).toMatch(/image: caddy:[^\n]+@sha256:[0-9a-f]{64}/)
    expect(compose).toMatch(/image: postgres:[^\n]+@sha256:[0-9a-f]{64}/)
  })
})

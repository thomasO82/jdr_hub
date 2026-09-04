import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const web = resolve(dirname(fileURLToPath(import.meta.url)), '../../apps/web')
const connectionPage = resolve(web, 'app/connexion/page.tsx')

describe('connection page', () => {
  it('offers visitors only the local Discord OAuth entry point', () => {
    expect(existsSync(connectionPage)).toBe(true)

    const page = readFileSync(connectionPage, 'utf8')

    expect(page).toContain('href="/api/auth/discord"')
    expect(page).toContain('Continuer avec Discord')
    expect(page).toContain('src="/branding/logo.svg"')
    expect(page).not.toContain('invité')
    expect(page).not.toContain('http')
  })

  it('keeps the authentication route out of search indexes', () => {
    expect(existsSync(connectionPage)).toBe(true)

    const page = readFileSync(connectionPage, 'utf8')

    expect(page).toContain('index: false')
    expect(page).toContain('follow: false')
  })
})

import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const web = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const connectionPage = resolve(web, 'features/authentication/connection-view.tsx')
const connectionRoute = resolve(web, 'app/connexion/page.tsx')
const connectionStyles = resolve(web, 'features/authentication/connection-view.module.css')

describe('connection page', () => {
  it('offers visitors only the local Discord OAuth entry point', () => {
    expect(existsSync(connectionPage)).toBe(true)

    const page = readFileSync(connectionPage, 'utf8')

    expect(page).toContain('href="/api/auth/discord"')
    expect(page).toContain('Continuer avec Discord')
    expect(page).toContain('src="/branding/logo.svg"')
    expect(page.match(/href=/g)).toHaveLength(1)
    expect(page).not.toContain('invité')
    expect(page).not.toContain('http')
    expect(page).not.toContain("'use client'")
  })

  it('keeps the authentication route out of search indexes', () => {
    expect(existsSync(connectionPage)).toBe(true)

    const page = readFileSync(connectionRoute, 'utf8')

    expect(page).toContain('index: false')
    expect(page).toContain('follow: false')
  })

  it('does not repeat the brand name for screen readers', () => {
    const page = readFileSync(connectionPage, 'utf8')

    expect(page).toContain('alt=""')
  })

  it('keeps the login call to action reachable on short viewports', () => {
    expect(existsSync(connectionStyles)).toBe(true)

    const styles = readFileSync(connectionStyles, 'utf8')

    expect(styles).not.toContain('overflow: hidden')
    expect(styles).toContain('overflow-x: hidden')
    expect(styles).toContain('min-height: 52px')
    expect(styles).toContain('.discordButton:focus-visible')
    expect(styles).not.toContain('url(')
  })

  it('removes non-essential motion when visitors request it', () => {
    const styles = readFileSync(connectionStyles, 'utf8')

    expect(styles).toContain('@media (prefers-reduced-motion: reduce)')
  })
})

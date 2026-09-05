import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const web = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const connectionPage = resolve(web, 'features/authentication/connection-view.tsx')
const connectionRoute = resolve(web, 'app/connexion/page.tsx')
const globalStyles = resolve(web, 'app/globals.css')

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
    expect(page).not.toContain('connection-view.module.css')
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
    expect(existsSync(globalStyles)).toBe(true)

    const page = readFileSync(connectionPage, 'utf8')

    expect(page).toContain('min-h-screen')
    expect(page).toContain('focus-visible:')
    expect(page).not.toContain('style={{')
  })

  it('removes non-essential motion when visitors request it', () => {
    const page = readFileSync(connectionPage, 'utf8')

    expect(page).toContain('motion-reduce:transition-none')
  })
})

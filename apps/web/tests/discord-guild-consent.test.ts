import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { createDiscordGuildApi } from '../lib/discord-guild-api.js'
import { DiscordGuildConsentView } from '../features/authentication/discord-guild-consent.js'
import { HomeView } from '../features/home/home-view.js'
import ProfilePage, { metadata } from '../app/profil/page.js'

const me = {
  id: 'user-1',
  username: 'AventuriereFictive',
  avatarUrl: null,
  timezone: 'Europe/Paris',
  discordServerJoined: false,
  discordServerPromptDismissed: false,
}

describe('Discord server consent API', () => {
  it('reads membership state from the authenticated current-user endpoint', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: me, error: null, meta: { requestId: 'request-1' } }), { status: 200 }))
    const api = createDiscordGuildApi({ baseUrl: 'http://localhost:8787/api', fetcher })

    await expect(api.getMembership()).resolves.toEqual({ joined: false, promptDismissed: false, username: 'AventuriereFictive', avatarUrl: null })
    expect(fetcher).toHaveBeenCalledWith('http://localhost:8787/api/me', expect.objectContaining({ credentials: 'include', cache: 'no-store' }))
  })

  it('dismisses only the optional prompt with the trusted origin and an empty payload', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    const api = createDiscordGuildApi({ baseUrl: 'http://localhost:8787/api', origin: 'http://localhost:8787', fetcher })

    await expect(api.dismissPrompt()).resolves.toBeUndefined()
    expect(fetcher).toHaveBeenCalledWith('http://localhost:8787/api/auth/discord/server/dismiss', expect.objectContaining({
      method: 'POST',
      credentials: 'include',
      headers: expect.objectContaining({ origin: 'http://localhost:8787', 'content-type': 'application/json' }),
      body: '{}',
    }))
  })

  it('replaces raw transport and server errors with a French message', async () => {
    const api = createDiscordGuildApi({ fetcher: vi.fn().mockRejectedValue(new Error('private provider detail')) })

    await expect(api.getMembership()).rejects.toThrow('Le statut Discord est indisponible. Réessayez dans un instant.')
  })
})

describe('Discord server consent presentation', () => {
  async function renderProfile(discord?: string) {
    return renderToStaticMarkup(await ProfilePage({ searchParams: Promise.resolve(discord ? { discord } : {}) }))
  }

  it('keeps profile settings reachable from the post-login home after the prompt is dismissed', () => {
    const html = renderToStaticMarkup(createElement(HomeView))

    expect(html).toContain('href="/profil"')
    expect(html).toContain('Gérer mes notifications Discord')
  })

  it('explains the optional server membership and keeps JDR Hub notifications available', () => {
    const html = renderToStaticMarkup(createElement(DiscordGuildConsentView, {
      mode: 'onboarding',
      membership: { joined: false, promptDismissed: false, username: 'AventuriereFictive', avatarUrl: null },
      onDismiss: () => undefined,
    }))

    expect(html).toContain('Recevoir aussi les alertes sur Discord')
    expect(html).toContain('notifications restent disponibles sur JDR Hub')
    expect(html).toContain('href="/api/auth/discord/server"')
    expect(html).toContain('Plus tard')
  })

  it('does not show the onboarding prompt again after dismissal but keeps the profile setting available', () => {
    const membership = { joined: false, promptDismissed: true, username: 'AventuriereFictive', avatarUrl: null }
    const onboarding = renderToStaticMarkup(createElement(DiscordGuildConsentView, { mode: 'onboarding', membership, onDismiss: () => undefined }))
    const settings = renderToStaticMarkup(createElement(DiscordGuildConsentView, { mode: 'settings', membership, onDismiss: () => undefined }))

    expect(onboarding).toBe('')
    expect(settings).toContain('href="/api/auth/discord/server"')
  })

  it('shows an accessible loading state while onboarding membership is loading', () => {
    const html = renderToStaticMarkup(createElement(DiscordGuildConsentView, {
      mode: 'onboarding',
      loading: true,
      membership: null,
      onDismiss: () => undefined,
    }))

    expect(html).toContain('aria-busy="true"')
    expect(html).toContain('Chargement de vos préférences Discord…')
  })

  it('keeps onboarding errors visible and retryable', () => {
    const html = renderToStaticMarkup(createElement(DiscordGuildConsentView, {
      mode: 'onboarding',
      error: 'Le statut Discord est indisponible. Réessayez dans un instant.',
      membership: null,
      onDismiss: () => undefined,
      onRetry: () => undefined,
    }))

    expect(html).toContain('role="alert"')
    expect(html).toContain('Réessayer')
  })

  it('confirms membership without implying that JDR Hub notifications are disabled', () => {
    const html = renderToStaticMarkup(createElement(DiscordGuildConsentView, {
      mode: 'settings',
      membership: { joined: true, promptDismissed: false, username: 'AventuriereFictive', avatarUrl: null },
      onDismiss: () => undefined,
    }))

    expect(html).toContain('Le bot peut vous envoyer ses notifications d’absence sur Discord.')
    expect(html).toContain('notifications restent disponibles sur JDR Hub')
    expect(html).not.toContain('href="/api/auth/discord/server"')
  })

  it('renders safe French outcomes on the private profile page', async () => {
    const connected = await renderProfile('connected')
    const declined = await renderProfile('declined')
    const unavailable = await renderProfile('unavailable')

    expect(connected).toContain('Le bot a bien été ajouté à votre compte Discord.')
    expect(declined).toContain('Vos notifications restent disponibles sur JDR Hub.')
    expect(unavailable).toContain('Réessayez plus tard')
    expect(connected).not.toContain('DISCORD_BOT_TOKEN')
    expect(connected).not.toContain('discordGuildId')
  })

  it('marks the profile page as private for search engines', () => {
    expect(metadata.robots).toEqual({ index: false, follow: false })
  })
})

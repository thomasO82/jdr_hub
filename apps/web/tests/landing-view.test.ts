import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { LandingView } from '../features/home/landing-view'

describe('public landing page', () => {
  it('presents JDR Hub in French with the official logo and a sign-in call to action', async () => {
    const html = renderToStaticMarkup(createElement(LandingView))

    expect(html).toContain('Organisez vos parties de jeu de rôle')
    expect(html).toContain('/branding/logo.svg')
    expect(html).toContain('href="/connexion"')
    expect(html).toContain('Commencer avec Discord')
  })

  it('describes implemented ways to organize a table', async () => {
    const html = renderToStaticMarkup(createElement(LandingView))

    expect(html).toContain('Créer et gérer vos parties')
    expect(html).toContain('Coordonner les disponibilités')
    expect(html).toContain('Planifier les séances')
  })

  it('does not expose a public game catalog or external demo imagery', async () => {
    const html = renderToStaticMarkup(createElement(LandingView))

    expect(html).not.toContain('href="/parties')
    expect(html).not.toContain('googleusercontent.com')
  })
})

'use client'

import React, { useEffect, useState } from 'react'
import { Check, MessageCircle, ShieldCheck } from 'lucide-react'
import { createDiscordGuildApi, type DiscordGuildMembership } from '../../lib/discord-guild-api'

type Mode = 'onboarding' | 'settings'

type DiscordGuildConsentViewProps = {
  mode: Mode
  membership: DiscordGuildMembership | null
  loading?: boolean
  error?: string | null
  saving?: boolean
  onDismiss: () => void
  onRetry?: () => void
}

const description = 'En autorisant l’ajout, vous rejoignez le serveur Discord privé réservé au bot JDR Hub. Si vous êtes MJ, il pourra vous envoyer par message privé les absences signalées pour vos séances.'
const privacyNote = 'Les notifications restent disponibles sur JDR Hub, même si vous refusez. Les messages de vos parties ne sont jamais envoyés à Discord.'

export function DiscordGuildConsentView({ mode, membership, loading = false, error = null, saving = false, onDismiss, onRetry }: DiscordGuildConsentViewProps) {
  if (mode === 'onboarding' && !loading && !error && (!membership || membership.joined || membership.promptDismissed)) return null

  if (loading) {
    return <section aria-busy="true" aria-label="Chargement des préférences Discord" className="grid gap-3 rounded-xl border border-outline-variant/50 bg-surface p-5 shadow-sm">
      <div className="h-5 w-48 animate-pulse rounded bg-surface-container motion-reduce:animate-none" />
      <div className="h-4 w-full animate-pulse rounded bg-surface-container motion-reduce:animate-none" />
      <p className="m-0 text-sm text-on-surface-variant" role="status">Chargement de vos préférences Discord…</p>
    </section>
  }

  if (error) {
    return <section aria-labelledby="discord-consent-title" className="grid gap-3 rounded-xl border border-error/30 bg-surface p-5 shadow-sm">
      <h2 className="m-0 font-display text-xl font-semibold text-on-surface" id="discord-consent-title">Notifications Discord</h2>
      <p className="m-0 text-sm text-on-error-container" role="alert">{error}</p>
      {onRetry ? <button className="min-h-11 justify-self-start rounded-lg border border-outline-variant px-4 text-sm font-semibold text-primary hover:bg-primary-fixed/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" onClick={onRetry} type="button">Réessayer</button> : null}
    </section>
  }

  if (!membership) {
    return <section aria-labelledby="discord-consent-title" className="grid gap-3 rounded-xl border border-outline-variant/50 bg-surface p-5 shadow-sm">
      <h2 className="m-0 font-display text-xl font-semibold text-on-surface" id="discord-consent-title">Notifications Discord</h2>
      <p className="m-0 text-sm leading-6 text-on-surface-variant">Connectez-vous pour gérer les notifications Discord.</p>
      <a className="inline-flex min-h-11 w-fit items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary no-underline hover:bg-primary-container focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" href="/connexion">Se connecter</a>
    </section>
  }

  if (membership.joined) {
    return <section aria-labelledby="discord-consent-title" className="grid gap-3 rounded-xl border border-outline-variant/50 bg-surface p-5 shadow-sm">
      <div className="flex items-center gap-2 text-primary"><Check aria-hidden="true" size={20} /><h2 className="m-0 font-display text-xl font-semibold text-on-surface" id="discord-consent-title">Discord est activé</h2></div>
      <p className="m-0 text-sm leading-6 text-on-surface-variant">Le bot peut vous envoyer ses notifications d’absence sur Discord.</p>
      <p className="m-0 text-sm leading-6 text-on-surface-variant">{privacyNote}</p>
    </section>
  }

  return <section aria-labelledby="discord-consent-title" className="grid gap-3 rounded-xl border border-outline-variant/50 bg-surface p-5 shadow-sm">
    <div className="flex items-center gap-2 text-primary"><MessageCircle aria-hidden="true" size={20} /><h2 className="m-0 font-display text-xl font-semibold text-on-surface" id="discord-consent-title">Recevoir aussi les alertes sur Discord</h2></div>
    <p className="m-0 text-sm leading-6 text-on-surface-variant">{description}</p>
    <p className="m-0 text-sm leading-6 text-on-surface-variant">{privacyNote}</p>
    <div className="flex flex-wrap items-center gap-3 pt-1">
      <a className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary no-underline transition-colors hover:bg-primary-container focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:w-fit" href="/api/auth/discord/server">
        <ShieldCheck aria-hidden="true" size={18} />Autoriser l’ajout au serveur privé
      </a>
      {mode === 'onboarding' ? <button className="min-h-11 rounded-lg px-4 text-sm font-semibold text-on-surface-variant transition-colors hover:bg-surface-container focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-60" disabled={saving} onClick={onDismiss} type="button">{saving ? 'Enregistrement…' : 'Plus tard'}</button> : null}
    </div>
  </section>
}

export function DiscordGuildConsent({ mode }: { mode: Mode }) {
  const [membership, setMembership] = useState<DiscordGuildMembership | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    void createDiscordGuildApi().getMembership().then((value) => {
      if (active) setMembership(value)
    }).catch(() => {
      if (active) setError('Le statut Discord est indisponible. Réessayez dans un instant.')
    })
    return () => { active = false }
  }, [attempt])

  async function dismissPrompt() {
    setSaving(true)
    setError(null)
    try {
      await createDiscordGuildApi().dismissPrompt()
      setMembership((current) => current ? { ...current, promptDismissed: true } : current)
    } catch {
      setError('Votre choix n’a pas pu être enregistré. Réessayez.')
    } finally {
      setSaving(false)
    }
  }

  return <DiscordGuildConsentView
    error={error}
    loading={membership === undefined && error === null}
    membership={membership ?? null}
    mode={mode}
    onDismiss={() => { void dismissPrompt() }}
    onRetry={() => { setError(null); setMembership(undefined); setAttempt((current) => current + 1) }}
    saving={saving}
  />
}

import type { Metadata } from 'next'
import React from 'react'
import { AppShell } from '../../features/layout/app-shell'
import { DiscordGuildConsent } from '../../features/authentication/discord-guild-consent'

export const metadata: Metadata = {
  title: 'Profil',
  description: 'Gérez vos notifications Discord sur JDR Hub.',
  robots: { index: false, follow: false },
}

type DiscordOutcome = 'connected' | 'declined' | 'unavailable'

function getDiscordOutcome(value: string | undefined): DiscordOutcome | null {
  return value === 'connected' || value === 'declined' || value === 'unavailable' ? value : null
}

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ discord?: string }>
}) {
  const { discord } = await searchParams
  const outcome = getDiscordOutcome(discord)

  return (
    <AppShell active="Profile">
      <main className="min-h-screen bg-background px-5 pb-28 pt-24 font-body text-on-surface md:px-8 md:pb-12 md:pt-10 lg:px-10">
        <section className="mx-auto grid max-w-4xl content-start gap-6" aria-labelledby="profile-title">
          <header>
            <h1 className="m-0 font-display text-4xl font-semibold tracking-tight" id="profile-title">
              Profil
            </h1>
            <p className="m-0 mt-2 text-sm leading-6 text-on-surface-variant">
              Gérez les notifications que vous recevez en plus de celles de JDR Hub.
            </p>
          </header>
          {outcome === 'connected' ? (
            <p className="m-0 rounded-lg border border-primary/20 bg-primary-fixed/40 p-4 text-sm text-on-surface" role="status">
              Le bot a bien été ajouté à votre compte Discord.
            </p>
          ) : null}
          {outcome === 'declined' ? (
            <p className="m-0 rounded-lg border border-outline-variant bg-surface p-4 text-sm text-on-surface-variant" role="status">
              Aucun ajout n’a été effectué. Vos notifications restent disponibles sur JDR Hub.
            </p>
          ) : null}
          {outcome === 'unavailable' ? (
            <p className="m-0 rounded-lg border border-error/30 bg-error-container p-4 text-sm text-on-error-container" role="alert">
              L’ajout au serveur Discord est momentanément indisponible. Réessayez plus tard ; vos notifications JDR Hub restent actives.
            </p>
          ) : null}
          <DiscordGuildConsent mode="settings" />
        </section>
      </main>
    </AppShell>
  )
}

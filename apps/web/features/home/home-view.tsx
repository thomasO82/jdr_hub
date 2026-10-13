import React from 'react'
import Link from 'next/link'
import { DiscordGuildConsent } from '../authentication/discord-guild-consent'

export function HomeView() {
  return (
    <main className="mx-auto grid min-h-screen w-full max-w-3xl content-center gap-6 px-5 py-10 font-body text-on-surface sm:px-8">
      <header className="flex items-center gap-3">
        <img className="h-12 w-12" src="/branding/logo.svg" alt="" />
        <div>
          <h1 className="m-0 font-display text-3xl font-semibold tracking-tight text-primary">JDR Hub</h1>
          <p className="m-0 mt-1 font-label text-xs uppercase tracking-wider text-on-surface-variant">Digital Dungeon Master</p>
        </div>
      </header>
      <section aria-labelledby="home-title" className="grid gap-3">
        <h2 className="m-0 font-display text-2xl font-semibold" id="home-title">
          Bienvenue sur JDR Hub
        </h2>
        <p className="m-0 max-w-2xl text-sm leading-6 text-on-surface-variant">Retrouvez ici les informations utiles pour organiser vos parties de jeu de rôle.</p>
      </section>
      <DiscordGuildConsent mode="onboarding" />
      <Link className="inline-flex min-h-11 w-fit items-center rounded-lg px-3 text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" href="/profil">Gérer mes notifications Discord</Link>
    </main>
  )
}

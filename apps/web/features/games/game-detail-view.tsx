import Link from 'next/link'
import type { PublicGame } from '@jdr-hub/shared'
import { AppShell } from '../layout/app-shell'

export function GameDetailView({ game }: { game: PublicGame }) {
  return (
    <AppShell>
      <main className="min-h-screen bg-background px-5 py-6 font-body text-on-surface md:px-6 md:py-10 lg:px-10">
        <section className="mx-auto max-w-6xl" aria-labelledby="game-detail-title">
          <Link className="mb-5 inline-block font-body text-sm text-on-surface-variant no-underline hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" href="/parties">← Toutes les parties</Link>
          <header className="flex min-h-80 items-end justify-between gap-6 rounded-3xl bg-gradient-to-br from-cover-night via-connection-mid to-cover-violet p-8 text-white shadow-lg shadow-primary/10 max-md:min-h-64 max-md:flex-col max-md:items-start max-md:p-6">
            <div>
              <div className="flex gap-2"><span className="rounded-lg bg-primary-container px-2.5 py-1.5 font-label text-xs font-bold uppercase tracking-wider">{game.type === 'CAMPAIGN' ? 'Campagne' : 'One-shot'}</span><span className="rounded-lg bg-white/20 px-2.5 py-1.5 font-label text-xs font-bold uppercase tracking-wider">{game.system}</span></div>
              <h1 className="m-0 mt-5 font-display text-5xl font-semibold tracking-tight max-md:text-4xl" id="game-detail-title">{game.title}</h1>
              <p className="m-0 mt-2 font-body text-base text-primary-fixed">Une aventure proposée par le maître du jeu.</p>
            </div>
            <div className="flex items-center gap-2.5 rounded-full border border-white/35 bg-black/25 px-3.5 py-2.5 max-md:w-full max-md:justify-center">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-primary-fixed font-body font-bold text-primary">M</span>
              <span><small className="block font-label text-xs uppercase text-violet-200">Maître du jeu</small><strong className="block font-body text-sm">{game.gameMaster.name}</strong></span>
            </div>
          </header>
          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <article className="rounded-2xl border border-surface-container-highest bg-surface p-8 shadow-sm max-md:p-6 lg:col-span-2">
              <h2 className="m-0 font-display text-2xl font-semibold">▱ Synopsis</h2>
              <p className="mt-5 font-body text-lg leading-relaxed text-on-surface-variant">{game.description}</p>
              <ul className="m-0 flex list-none flex-wrap gap-2 p-0">{game.tags.map((tag) => <li className="rounded-full bg-primary-fixed px-2 py-1 font-body text-xs font-semibold text-on-primary-fixed" key={tag.slug}>#{tag.name}</li>)}</ul>
            </article>
            <aside className="grid content-start gap-6 lg:col-span-1">
              <section className="rounded-2xl border border-primary-fixed-dim bg-primary-fixed/50 p-7 text-center"><h2 className="m-0 font-display text-2xl font-semibold">Rejoindre l'aventure</h2><p className="mt-3 font-body leading-relaxed text-on-surface-variant">Les candidatures sont ouvertes.</p><button className="mt-3 min-h-11 w-full rounded-lg border-0 bg-primary px-4 font-body font-semibold text-on-primary transition-colors hover:bg-primary-container focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" type="button">Postuler pour rejoindre</button></section>
              <section className="rounded-2xl border border-surface-container-highest bg-surface p-5 shadow-sm"><h2 className="m-0 font-display text-xl font-semibold">Détails de la partie</h2><dl className="mt-5 grid gap-4">{[['Système', game.system], ['Joueurs', `${game.maxPlayers} places maximum`], ['Type', game.type === 'CAMPAIGN' ? 'Campagne' : 'One-shot'], ['Statut', game.status === 'ACTIVE' ? 'En cours' : 'Inscriptions ouvertes']].map(([label, value]) => <div key={label}><dt className="font-label text-xs font-bold uppercase tracking-wider text-on-surface-variant">{label}</dt><dd className="m-0 mt-1 font-body">{value}</dd></div>)}</dl></section>
            </aside>
          </div>
        </section>
      </main>
    </AppShell>
  )
}

import React from 'react'
import { CalendarDays, Dice6, ShieldCheck, UsersRound } from 'lucide-react'
import Link from 'next/link'

const features = [
  {
    icon: UsersRound,
    title: 'Créer et gérer vos parties',
    description: 'Présentez votre aventure et composez une table avec les bons joueurs.',
  },
  {
    icon: CalendarDays,
    title: 'Coordonner les disponibilités',
    description: 'Trouvez des créneaux compatibles et organisez la prochaine séance.',
  },
  {
    icon: ShieldCheck,
    title: 'Planifier les séances',
    description: 'Centralisez les propositions, les votes et le planning de votre groupe.',
  },
]

export function LandingView(): React.JSX.Element {
  return (
    <main className="min-h-screen bg-inverse-surface font-body text-inverse-on-surface">
      <header className="sticky top-0 z-40 border-b border-primary-fixed/15 bg-inverse-surface/95 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link className="inline-flex items-center gap-2 text-inverse-primary no-underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-inverse-primary" href="/">
            <img className="h-8 w-auto" src="/branding/logo.svg" alt="" />
            <span className="font-display text-xl font-semibold">JDR Hub</span>
          </Link>
          <nav className="hidden items-center gap-8 text-sm text-primary-fixed md:flex" aria-label="Navigation de présentation">
            <a className="no-underline hover:text-inverse-on-surface focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-inverse-primary" href="#fonctionnalites">Fonctionnalités</a>
            <a className="no-underline hover:text-inverse-on-surface focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-inverse-primary" href="#comment-ca-marche">Comment ça marche</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link className="inline-flex min-h-11 items-center justify-center rounded-md border border-primary-fixed/50 px-3 text-sm font-semibold text-inverse-on-surface no-underline hover:bg-primary-fixed/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inverse-primary sm:px-4" href="/connexion">Connexion</Link>
            <Link className="hidden min-h-11 items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-on-primary no-underline hover:bg-primary-container focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inverse-primary sm:inline-flex" href="/connexion">Commencer</Link>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-16 px-4 py-12 sm:px-6 sm:py-16 lg:gap-24 lg:px-8 lg:py-20">
        <section className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16" aria-labelledby="landing-title">
          <div className="grid content-center gap-6">
            <p className="m-0 font-label text-xs font-semibold uppercase tracking-widest text-inverse-primary">L’organisation de vos aventures</p>
            <h1 className="m-0 max-w-2xl font-display text-4xl font-bold leading-tight tracking-tight text-inverse-on-surface sm:text-5xl lg:text-6xl" id="landing-title">
              Organisez vos parties de jeu de rôle <span className="text-inverse-primary">sans effort</span>
            </h1>
            <p className="m-0 max-w-xl text-base leading-relaxed text-primary-fixed sm:text-lg">
              JDR Hub aide les Maîtres du Jeu et les joueurs à créer leur table,
              trouver un moment pour jouer et garder le fil de leurs aventures.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-primary px-6 text-sm font-semibold text-on-primary no-underline shadow-sm transition-colors hover:bg-primary-container focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-inverse-primary motion-reduce:transition-none" href="/connexion">
                <Dice6 aria-hidden="true" size={20} />
                Commencer avec Discord
              </Link>
              <a className="inline-flex min-h-12 items-center justify-center rounded-lg border border-primary-fixed/50 px-6 text-sm font-semibold text-inverse-on-surface no-underline transition-colors hover:bg-primary-fixed/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-inverse-primary motion-reduce:transition-none" href="#fonctionnalites">
                Découvrir les fonctionnalités
              </a>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-primary-fixed/20 bg-connection-start p-5 shadow-xl sm:p-8" aria-label="Aperçu des outils d’organisation de JDR Hub">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary-container/35 via-transparent to-connection-end/80" aria-hidden="true" />
            <div className="relative grid gap-4">
              <div className="flex items-center justify-between gap-3 rounded-xl border border-primary-fixed/20 bg-inverse-surface/80 p-4">
                <div className="flex items-center gap-3">
                  <span className="grid size-11 place-items-center rounded-lg bg-primary/20 text-inverse-primary"><Dice6 aria-hidden="true" size={22} /></span>
                  <div>
                    <p className="m-0 font-label text-xs font-semibold uppercase tracking-wider text-inverse-primary">Votre prochaine aventure</p>
                    <p className="m-0 mt-1 font-display text-lg font-semibold text-inverse-on-surface">La table est prête</p>
                  </div>
                </div>
                <span className="rounded-full bg-primary/25 px-3 py-1 font-label text-xs font-medium text-inverse-primary">JDR</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-primary-fixed/15 bg-inverse-surface/75 p-4">
                  <UsersRound className="mb-3 text-inverse-primary" aria-hidden="true" size={22} />
                  <p className="m-0 font-label text-xs uppercase tracking-wider text-primary-fixed">Groupe</p>
                  <p className="m-0 mt-1 font-display text-lg font-semibold">Les bons joueurs</p>
                  <p className="m-0 mt-2 text-sm text-primary-fixed">Candidatures et invitations réunies.</p>
                </div>
                <div className="rounded-xl border border-primary-fixed/15 bg-inverse-surface/75 p-4">
                  <CalendarDays className="mb-3 text-inverse-primary" aria-hidden="true" size={22} />
                  <p className="m-0 font-label text-xs uppercase tracking-wider text-primary-fixed">Prochaine séance</p>
                  <p className="m-0 mt-1 font-display text-lg font-semibold">Un créneau commun</p>
                  <p className="m-0 mt-2 text-sm text-primary-fixed">Disponibilités et votes au même endroit.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-8" id="fonctionnalites" aria-labelledby="features-title">
          <div className="mx-auto grid max-w-2xl gap-3 text-center">
            <h2 className="m-0 font-display text-3xl font-semibold text-inverse-on-surface sm:text-4xl" id="features-title">Tout pour faire vivre votre table</h2>
            <p className="m-0 text-base leading-relaxed text-primary-fixed">Des outils simples pour préparer les parties et faciliter la coordination du groupe.</p>
          </div>
          <ul className="m-0 grid list-none gap-4 p-0 md:grid-cols-3">
            {features.map(({ icon: Icon, title, description }) => (
              <li className="grid content-start gap-4 rounded-xl bg-surface p-5 text-on-surface shadow-sm sm:p-6" key={title}>
                <span className="grid size-12 place-items-center rounded-lg bg-primary-fixed text-primary"><Icon aria-hidden="true" size={23} /></span>
                <h3 className="m-0 font-display text-xl font-semibold">{title}</h3>
                <p className="m-0 text-sm leading-relaxed text-on-surface-variant">{description}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="grid gap-8 rounded-2xl border border-primary-fixed/20 bg-connection-start/70 px-5 py-8 sm:px-8 sm:py-10 lg:grid-cols-[1fr_auto] lg:items-center" id="comment-ca-marche" aria-labelledby="start-title">
          <div className="grid gap-3">
            <h2 className="m-0 font-display text-2xl font-semibold text-inverse-on-surface sm:text-3xl" id="start-title">Prêts à lancer votre prochaine partie ?</h2>
            <p className="m-0 max-w-2xl text-sm leading-relaxed text-primary-fixed sm:text-base">Connectez-vous avec Discord pour créer une partie ou rejoindre votre groupe.</p>
          </div>
          <Link className="inline-flex min-h-12 items-center justify-center rounded-lg bg-primary px-6 text-sm font-semibold text-on-primary no-underline hover:bg-primary-container focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-inverse-primary" href="/connexion">Commencer avec Discord</Link>
        </section>
      </div>

      <footer className="border-t border-primary-fixed/15 px-4 py-6 text-center text-sm text-primary-fixed sm:px-6">
        <p className="m-0">© {new Date().getFullYear()} JDR Hub</p>
      </footer>
    </main>
  )
}

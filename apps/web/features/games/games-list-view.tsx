import Link from 'next/link'
import { CalendarDays, Globe2, LayoutGrid, List, Search, UsersRound } from 'lucide-react'
import { createGamesApi, type GamesPage } from './games-api'
import { FiltersToggle } from './filters-toggle'
import { AppShell } from '../layout/app-shell'

type SearchParams = Record<string, string | string[] | undefined>

function buildQuery(searchParams: SearchParams): string {
  const query = new URLSearchParams()

  for (const key of ['q', 'gmId', 'gmName', 'page', 'pageSize']) {
    const value = searchParams[key]
    if (typeof value === 'string' && value.length > 0) query.set(key, value)
  }

  const tags = searchParams.tagSlugs
  for (const tag of Array.isArray(tags) ? tags : tags ? [tags] : []) query.append('tagSlugs', tag)
  return query.toString()
}

function GameCard({ game }: { game: GamesPage['items'][number] }) {
  const cover = game.type === 'CAMPAIGN'
    ? 'bg-gradient-to-br from-cover-night via-primary-container to-cover-violet'
    : 'bg-gradient-to-br from-cover-warm via-cover-amber to-cover-red'

  return (
    <article className="overflow-hidden rounded-2xl border border-surface-container-highest bg-surface shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/10">
      <Link className="block text-on-surface no-underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary" href={`/parties/${game.slug}`}>
        <div className={`relative flex min-h-48 items-end justify-between overflow-hidden px-3.5 py-3.5 text-white ${cover}`}>
          <span className="relative inline-flex items-center gap-1 rounded-md bg-black/40 px-2 py-1.5 font-label text-xs font-semibold"><UsersRound aria-hidden="true" size={14} />{game.maxPlayers} places</span>
          <span className="relative rounded-md bg-primary px-2 py-1.5 font-label text-xs font-semibold uppercase">{game.system}</span>
        </div>
        <div className="grid gap-2.5 p-4">
          <p className="m-0 font-label text-xs font-bold uppercase tracking-wider text-primary">{game.type === 'CAMPAIGN' ? 'Campagne' : 'One-shot'}</p>
          <h2 className="m-0 truncate font-display text-xl font-semibold tracking-tight">{game.title}</h2>
          <p className="m-0 line-clamp-2 font-body text-sm leading-relaxed text-on-surface-variant">{game.description}</p>
          <div className="flex justify-between gap-2 border-t border-surface-container pt-3 font-label text-xs font-semibold text-on-surface-variant">
            <span className="inline-flex items-center gap-1"><CalendarDays aria-hidden="true" size={14} />Prochaine séance à définir</span>
            <span className="inline-flex items-center gap-1"><Globe2 aria-hidden="true" size={14} />En ligne</span>
          </div>
          <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
            {game.tags.map((tag) => <li className="rounded-full bg-primary-fixed px-2 py-1 font-body text-xs font-semibold text-on-primary-fixed" key={tag}>#{tag}</li>)}
          </ul>
        </div>
      </Link>
    </article>
  )
}

export async function GamesListView({ searchParams = {} }: { searchParams?: SearchParams }) {
  const api = createGamesApi()
  const [result, tags] = await Promise.all([api.list(buildQuery(searchParams)), api.tags()])
  const selectedTags = searchParams.tagSlugs
  const selectedTagValues = Array.isArray(selectedTags) ? selectedTags : selectedTags ? [selectedTags] : []

  return (
    <AppShell>
      <main className="min-h-screen bg-background px-5 py-6 font-body text-on-surface md:px-6 md:py-10 lg:px-10">
        <form className="mx-auto grid max-w-6xl items-start gap-6 lg:grid-cols-3" action="/parties" method="get">
          <aside className="rounded-xl border border-surface-container-highest bg-surface p-4 shadow-sm lg:col-span-1" aria-label="Filtres des parties">
            <div className="flex items-center justify-between border-b border-outline-variant pb-4">
              <h2 className="m-0 font-display text-xl font-semibold">Filtres</h2>
              <Link className="font-body text-xs text-primary no-underline hover:underline" href="/parties">Réinitialiser</Link>
            </div>
            {selectedTagValues.length > 0 && <div className="flex flex-wrap gap-1.5 py-3" aria-label="Filtres actifs">{selectedTagValues.map((slug) => <span className="rounded-full bg-primary-fixed px-2 py-1 font-body text-xs font-semibold text-on-primary-fixed" key={slug}>{tags?.find((tag) => tag.slug === slug)?.name ?? slug} ×</span>)}</div>}
            <FiltersToggle>
              <fieldset className="grid gap-2.5 border-0 p-0"><legend className="mb-1 font-label text-xs font-bold uppercase tracking-wider text-on-surface-variant">Système</legend>{(tags ?? []).map((tag) => <label className="flex items-center gap-2 font-body text-sm text-on-surface-variant" key={tag.slug}><input className="h-4 w-4 accent-primary" type="checkbox" name="tagSlugs" value={tag.slug} defaultChecked={selectedTagValues.includes(tag.slug)} /><span>{tag.name}</span></label>)}</fieldset>
              <fieldset className="grid gap-2.5 border-0 p-0"><legend className="mb-1 font-label text-xs font-bold uppercase tracking-wider text-on-surface-variant">Type</legend><label className="flex items-center gap-2 font-body text-sm text-on-surface-variant"><input className="h-4 w-4 accent-primary" type="radio" name="visualType" value="ONE_SHOT" defaultChecked /><span>One-shot</span></label><label className="flex items-center gap-2 font-body text-sm text-on-surface-variant"><input className="h-4 w-4 accent-primary" type="radio" name="visualType" value="CAMPAIGN" /><span>Campagne</span></label></fieldset>
              <fieldset className="grid gap-2.5 border-0 p-0"><legend className="mb-1 font-label text-xs font-bold uppercase tracking-wider text-on-surface-variant">Format</legend><div className="grid grid-cols-2 gap-2"><label className="grid min-h-8 cursor-pointer place-items-center rounded-lg border border-primary-fixed-dim font-body text-xs text-on-surface-variant"><input className="peer sr-only" type="radio" name="visualFormat" value="ONLINE" defaultChecked /><span className="rounded-lg px-2 py-1 peer-checked:bg-primary-fixed peer-checked:font-semibold peer-checked:text-primary">En ligne</span></label><label className="grid min-h-8 cursor-pointer place-items-center rounded-lg border border-surface-container-highest font-body text-xs text-on-surface-variant"><input className="peer sr-only" type="radio" name="visualFormat" value="TABLE" /><span className="rounded-lg px-2 py-1 peer-checked:bg-primary-fixed peer-checked:font-semibold peer-checked:text-primary">Sur table</span></label></div></fieldset>
              <button className="min-h-10 rounded-lg border-0 bg-primary font-body text-sm font-semibold text-on-primary transition-colors hover:bg-primary-container focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" type="submit">Appliquer les filtres</button>
              <p className="m-0 font-body text-xs leading-relaxed text-on-surface-variant">Tous les tags doivent correspondre à la partie.</p>
            </FiltersToggle>
          </aside>
          <section className="min-w-0 lg:col-span-2" aria-labelledby="games-title">
            <header className="flex items-end justify-between gap-5 border-b border-surface-container-highest pb-5">
              <div><p className="m-0 mb-2 font-label text-xs font-bold uppercase tracking-wider text-primary">Découvrir</p><h1 className="m-0 font-display text-4xl font-semibold tracking-tight" id="games-title">Catalogue de Parties</h1><p className="m-0 mt-1.5 font-body text-base text-on-surface-variant">Trouvez votre prochaine aventure.</p></div>
              <div className="inline-flex shrink-0 gap-0.5 rounded-lg border border-surface-container-highest bg-surface p-1" aria-label="Affichage des parties"><button className="grid h-7 w-7 place-items-center rounded bg-primary-fixed text-primary" type="button" aria-label="Vue en grille" aria-pressed="true"><LayoutGrid aria-hidden="true" size={16} /></button><button className="grid h-7 w-7 place-items-center rounded text-on-surface-variant" type="button" aria-label="Vue en liste" aria-pressed="false"><List aria-hidden="true" size={16} /></button></div>
            </header>
            <label className="mt-6 flex min-h-11 items-center gap-2.5 rounded-lg border border-outline-variant bg-surface px-3.5 text-on-surface-variant focus-within:border-primary focus-within:outline-2 focus-within:outline-primary/30"><Search aria-hidden="true" size={20} /><span className="sr-only">Rechercher une partie</span><input className="w-full border-0 bg-transparent font-body text-sm text-on-surface outline-none" name="q" placeholder="Rechercher une partie..." defaultValue={typeof searchParams.q === 'string' ? searchParams.q : ''} /></label>
            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">{result?.items.map((game) => <GameCard game={game} key={game.id} />)}</div>
            {!result && <p className="mt-5 rounded-xl border border-dashed border-outline-variant bg-surface p-10 text-center font-body text-sm text-on-surface-variant" role="alert">Impossible de charger les parties pour le moment.</p>}
            {result && result.items.length === 0 && <p className="mt-5 rounded-xl border border-dashed border-outline-variant bg-surface p-10 text-center font-body text-sm text-on-surface-variant">Aucune partie ne correspond à ces filtres.</p>}
          </section>
        </form>
      </main>
    </AppShell>
  )
}

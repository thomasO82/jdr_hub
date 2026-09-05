import Link from 'next/link'
import { CalendarDays, Globe2, LayoutGrid, List, Search, UsersRound } from 'lucide-react'
import { createGamesApi, type GamesPage } from './games-api'
import { FiltersToggle } from './filters-toggle'
import { AppShell } from '../layout/app-shell'
import styles from './games-view.module.css'

type SearchParams = Record<string, string | string[] | undefined>

function buildQuery(searchParams: SearchParams): string {
  const query = new URLSearchParams()

  for (const key of ['q', 'gmId', 'gmName', 'page', 'pageSize']) {
    const value = searchParams[key]
    if (typeof value === 'string' && value.length > 0) query.set(key, value)
  }

  const tags = searchParams.tagSlugs
  for (const tag of Array.isArray(tags) ? tags : tags ? [tags] : []) {
    query.append('tagSlugs', tag)
  }

  return query.toString()
}

function GameCard({ game }: { game: GamesPage['items'][number] }) {
  return (
    <article className={styles.gameCard}>
      <Link className={styles.cardLink} href={`/parties/${game.slug}`}>
        <div className={`${styles.cover} ${game.type === 'CAMPAIGN' ? styles.coverCampaign : styles.coverOneShot}`}>
          <span className={styles.playerBadge}><UsersRound aria-hidden="true" size={14} /> {game.maxPlayers} places</span>
          <span className={styles.coverSystem}>{game.system}</span>
        </div>
        <div className={styles.cardBody}>
          <p className={styles.eyebrow}>{game.type === 'CAMPAIGN' ? 'Campagne' : 'One-shot'}</p>
          <h2>{game.title}</h2>
          <p className={styles.cardDescription}>{game.description}</p>
          <div className={styles.cardMeta}><span><CalendarDays aria-hidden="true" size={14} /> Prochaine séance à définir</span><span><Globe2 aria-hidden="true" size={14} /> En ligne</span></div>
          <ul className={styles.tags}>
            {game.tags.map((tag) => <li className={styles.tag} key={tag}>#{tag}</li>)}
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
      <main className={styles.page}>
        <form className={styles.catalogLayout} action="/parties" method="get">
          <aside className={styles.filterSidebar} aria-label="Filtres des parties">
            <div className={styles.filterHeading}>
              <h2>Filtres</h2>
              <Link href="/parties">Réinitialiser</Link>
            </div>
            {selectedTagValues.length > 0 && (
              <div className={styles.selectedFilters} aria-label="Filtres actifs">
                {selectedTagValues.map((slug) => {
                  const tag = tags?.find((item) => item.slug === slug)
                  return <span className={styles.selectedFilter} key={slug}>{tag?.name ?? slug} <span aria-hidden="true">×</span></span>
                })}
              </div>
            )}
            <FiltersToggle>
              <fieldset className={styles.filterSection}>
                <legend>Système</legend>
                {(tags ?? []).map((tag) => (
                  <label className={styles.checkOption} key={tag.slug}>
                    <input type="checkbox" name="tagSlugs" value={tag.slug} defaultChecked={selectedTagValues.includes(tag.slug)} />
                    <span>{tag.name}</span>
                  </label>
                ))}
              </fieldset>
              <fieldset className={styles.filterSection}>
                <legend>Type</legend>
                <label className={styles.checkOption}><input type="radio" name="visualType" value="ONE_SHOT" defaultChecked /><span>One-shot</span></label>
                <label className={styles.checkOption}><input type="radio" name="visualType" value="CAMPAIGN" /><span>Campagne</span></label>
              </fieldset>
              <fieldset className={styles.filterSection}>
                <legend>Format</legend>
                <div className={styles.formatOptions}>
                  <label className={styles.formatOption}><input type="radio" name="visualFormat" value="ONLINE" defaultChecked /><span>En ligne</span></label>
                  <label className={styles.formatOption}><input type="radio" name="visualFormat" value="TABLE" /><span>Sur table</span></label>
                </div>
              </fieldset>
              <button className={styles.filterSubmit} type="submit">Appliquer les filtres</button>
              <p className={styles.filterNote}>Tous les tags doivent correspondre à la partie.</p>
            </FiltersToggle>
          </aside>

          <section className={styles.catalogContent} aria-labelledby="games-title">
            <header className={styles.catalogHeader}>
              <div>
                <p className={styles.eyebrow}>Découvrir</p>
                <h1 className={styles.title} id="games-title">Catalogue de Parties</h1>
                <p className={styles.intro}>Trouvez votre prochaine aventure.</p>
              </div>
              <div className={styles.viewToggle} aria-label="Affichage des parties">
                <button type="button" aria-label="Vue en grille" aria-pressed="true"><LayoutGrid aria-hidden="true" size={16} /></button>
                <button type="button" aria-label="Vue en liste" aria-pressed="false"><List aria-hidden="true" size={16} /></button>
              </div>
            </header>
            <label className={styles.searchField}>
              <Search aria-hidden="true" size={20} />
              <span className="sr-only">Rechercher une partie</span>
              <input name="q" placeholder="Rechercher une partie..." defaultValue={typeof searchParams.q === 'string' ? searchParams.q : ''} />
            </label>
            <div className={styles.grid}>
              {result?.items.map((game) => <GameCard game={game} key={game.id} />)}
            </div>
            {!result && <p className={styles.empty} role="alert">Impossible de charger les parties pour le moment.</p>}
            {result && result.items.length === 0 && <p className={styles.empty}>Aucune partie ne correspond à ces filtres.</p>}
          </section>
        </form>
      </main>
    </AppShell>
  )
}

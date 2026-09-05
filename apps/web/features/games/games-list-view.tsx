import Link from 'next/link'
import { createGamesApi, type GamesPage } from './games-api'
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
    <article className={styles.card}>
      <Link className={styles.cardLink} href={`/parties/${game.slug}`}>
        <p className={styles.eyebrow}>{game.type === 'CAMPAIGN' ? 'Campagne' : 'One-shot'}</p>
        <h2>{game.title}</h2>
        <p className={styles.meta}>{game.system} · {game.maxPlayers} places maximum</p>
        <ul className={styles.tags}>
          {game.tags.map((tag) => <li className={styles.tag} key={tag}>#{tag}</li>)}
        </ul>
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
    <main className={styles.page}>
      <section className={styles.shell} aria-labelledby="games-title">
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Découvrir</p>
            <h1 className={styles.title} id="games-title">Trouvez votre prochaine partie</h1>
            <p className={styles.intro}>Explorez les aventures proposées par la communauté et filtrez selon vos envies.</p>
          </div>
          <Link className={styles.primary} href="/parties/nouvelle">Créer une partie</Link>
        </header>
        <form className={styles.filters} action="/parties" method="get">
          <label>
            <span className="sr-only">Rechercher une partie</span>
            <input className={styles.input} name="q" placeholder="Rechercher une partie" defaultValue={typeof searchParams.q === 'string' ? searchParams.q : ''} />
          </label>
          <label>
            <span className="sr-only">Filtrer par tags</span>
            <select className={styles.select} name="tagSlugs" multiple defaultValue={selectedTagValues}>
              {tags?.map((tag) => <option value={tag.slug} key={tag.slug}>{tag.name}</option>)}
            </select>
          </label>
          <button className={styles.primary} type="submit">Rechercher</button>
          <p className={styles.filterNote}>Tous les tags doivent correspondre à la partie.</p>
        </form>
        <div className={styles.grid}>
          {result?.items.map((game) => <GameCard game={game} key={game.id} />)}
        </div>
        {!result && <p className={styles.empty} role="alert">Impossible de charger les parties pour le moment.</p>}
        {result && result.items.length === 0 && <p className={styles.empty}>Aucune partie ne correspond à ces filtres.</p>}
      </section>
    </main>
  )
}

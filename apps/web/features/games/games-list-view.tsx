import Link from 'next/link'
import styles from './games-view.module.css'

const examples = [
  { slug: 'la-crypte-maudite', title: 'La Crypte Maudite', system: 'D&D 5e · One-shot', gm: 'AventureFictive', tags: ['horror', 'débutant'] },
  { slug: 'chroniques-avalon', title: 'Les Chroniques d’Avalon', system: 'Pathfinder · Campagne', gm: 'Morgane', tags: ['fantasy', 'roleplay'] },
]

export function GamesListView() {
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
            <input className={styles.input} name="q" placeholder="Rechercher une partie" />
          </label>
          <label>
            <span className="sr-only">Filtrer par tags</span>
            <select className={styles.select} name="tagSlugs" defaultValue=""><option value="">Tous les tags</option><option value="horror">Horreur</option><option value="fantasy">Fantasy</option></select>
          </label>
          <button className={styles.primary} type="submit">Rechercher</button>
          <p className={styles.filterNote}>Tous les tags doivent correspondre à la partie.</p>
        </form>
        <div className={styles.grid}>
          {examples.map((game) => (
            <article className={styles.card} key={game.slug}>
              <Link className={styles.cardLink} href={`/parties/${game.slug}`}>
                <h2>{game.title}</h2>
                <p className={styles.meta}>{game.system} · MJ : {game.gm}</p>
                <ul className={styles.tags}>
                  {game.tags.map((tag) => <li className={styles.tag} key={tag}>{tag}</li>)}
                </ul>
              </Link>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}

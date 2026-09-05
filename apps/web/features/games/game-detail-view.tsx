import Link from 'next/link'
import type { PublicGame } from './games-api'
import { AppShell } from '../layout/app-shell'
import styles from './games-view.module.css'

export function GameDetailView({ game }: { game: PublicGame }) {
  return (
    <AppShell>
      <main className={styles.page}>
        <section className={styles.detailShell} aria-labelledby="game-detail-title">
        <Link className={styles.backLink} href="/parties">← Toutes les parties</Link>
        <header className={styles.hero}>
          <div className={styles.heroContent}>
            <div className={styles.heroTags}>
              <span className={styles.heroTag}>{game.type === 'CAMPAIGN' ? 'Campagne' : 'One-shot'}</span>
              <span className={styles.heroTagMuted}>{game.system}</span>
            </div>
            <h1 id="game-detail-title">{game.title}</h1>
            <p>Une aventure proposée par le maître du jeu.</p>
          </div>
          <div className={styles.gmBadge}>
            <span className={styles.avatar}>M</span>
            <span>
              <small>Maître du jeu</small>
              <strong>Organisateur de la partie</strong>
            </span>
          </div>
        </header>
        <div className={styles.detailGrid}>
          <article className={`${styles.card} ${styles.synopsis}`}>
            <h2>▱ Synopsis</h2>
            <p>{game.description}</p>
            <ul className={styles.tags}>
              {game.tags.map((tag) => <li className={styles.tag} key={tag}>#{tag}</li>)}
            </ul>
          </article>
          <aside className={styles.detailAside}>
            <section className={styles.joinCard}>
              <h2>Rejoindre l'aventure</h2>
              <p>Les candidatures sont ouvertes.</p>
              <button className={styles.primary} type="button">
                Postuler pour rejoindre
              </button>
            </section>
            <section className={styles.card}>
              <h2>Détails de la partie</h2>
              <dl className={styles.details}>
                <div>
                  <dt>Système</dt>
                  <dd>{game.system}</dd>
                </div>
                <div>
                  <dt>Joueurs</dt>
                  <dd>{game.maxPlayers} places maximum</dd>
                </div>
                <div>
                  <dt>Type</dt>
                  <dd>{game.type === 'CAMPAIGN' ? 'Campagne' : 'One-shot'}</dd>
                </div>
                <div>
                  <dt>Statut</dt>
                  <dd>{game.status === 'ACTIVE' ? 'En cours' : 'Inscriptions ouvertes'}</dd>
                </div>
              </dl>
            </section>
          </aside>
        </div>
        </section>
      </main>
    </AppShell>
  )
}

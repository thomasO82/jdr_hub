import Link from 'next/link'
import styles from './games-view.module.css'

export function GameDetailView() {
  return (
    <main className={styles.page}>
      <section className={styles.detailShell} aria-labelledby="game-detail-title">
        <Link className={styles.backLink} href="/parties">← Toutes les parties</Link>
        <header className={styles.hero}>
          <div className={styles.heroContent}>
            <div className={styles.heroTags}>
              <span className={styles.heroTag}>Campagne</span>
              <span className={styles.heroTagMuted}>D&amp;D 5e</span>
            </div>
            <h1 id="game-detail-title">La Crypte Maudite</h1>
            <p>Une aventure sombre et mystérieuse menée par MaîtreHibou.</p>
          </div>
          <div className={styles.gmBadge}>
            <span className={styles.avatar}>M</span>
            <span>
              <small>Maître du jeu</small>
              <strong>MaîtreHibou</strong>
            </span>
          </div>
        </header>
        <div className={styles.detailGrid}>
          <article className={`${styles.card} ${styles.synopsis}`}>
            <h2>▱ Synopsis</h2>
            <p>
              Depuis des siècles, la Crypte d’Oakhaven repose en silence sous les
              collines d’émeraude, scellée par une magie dont on a oublié le nom.
              Mais récemment, le sceau a commencé à se fissurer.
            </p>
            <p>
              Vous êtes un groupe d’aventuriers hétéroclites, engagés pour
              enquêter sur ces phénomènes avant que la corruption n’atteigne le
              village.
            </p>
            <ul className={styles.tags}>
              <li className={styles.tag}>#DarkFantasy</li>
              <li className={styles.tag}>#Exploration</li>
              <li className={styles.tag}>#HorreurPsychologique</li>
            </ul>
          </article>
          <aside className={styles.detailAside}>
            <section className={styles.joinCard}>
              <h2>Rejoindre l'aventure</h2>
              <p>3 places restantes. Candidatures ouvertes.</p>
              <button className={styles.primary} type="button">
                Postuler pour rejoindre
              </button>
            </section>
            <section className={styles.card}>
              <h2>Détails de la partie</h2>
              <dl className={styles.details}>
                <div>
                  <dt>Système</dt>
                  <dd>Dungeons &amp; Dragons 5E</dd>
                </div>
                <div>
                  <dt>Joueurs</dt>
                  <dd>2 / 5 <span>(3 requis)</span></dd>
                </div>
                <div>
                  <dt>Mode</dt>
                  <dd>En ligne</dd>
                </div>
                <div>
                  <dt>Outils</dt>
                  <dd>Discord</dd>
                </div>
              </dl>
            </section>
          </aside>
        </div>
      </section>
    </main>
  )
}

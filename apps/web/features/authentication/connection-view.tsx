import { MessageCircle, ShieldCheck } from 'lucide-react'
import styles from './connection-view.module.css'

export function ConnectionView() {
  return (
    <main className={styles.page} aria-labelledby="connection-title">
      <section className={styles.content}>
        <header className={styles.brand}>
          <img className={styles.logo} src="/branding/logo.svg" alt="" />
          <h1 id="connection-title">JDR Hub</h1>
          <p className={styles.tagline}>Digital Dungeon Master</p>
        </header>
        <p className={styles.introduction}>
          Rejoignez la communauté de rôlistes. Organisez vos parties, trouvez
          des joueurs et vivez vos aventures.
        </p>
        <a className={styles.discordButton} href="/api/auth/discord">
          <MessageCircle aria-hidden="true" size={22} strokeWidth={2.25} />
          Continuer avec Discord
        </a>
        <p className={styles.securityNote}>
          <ShieldCheck aria-hidden="true" size={17} strokeWidth={2} />
          Connexion sécurisée via Discord
        </p>
        <p className={styles.notice}>
          Discord sert uniquement à vous identifier. Vous n’avez aucun mot de
          passe à créer.
        </p>
      </section>
    </main>
  )
}

import type { Metadata } from 'next'
import { MessageCircle, ShieldCheck } from 'lucide-react'

import styles from './page.module.css'

export const metadata: Metadata = {
  title: 'Connexion',
  description: 'Connectez-vous à JDR Hub avec votre compte Discord.',
  robots: {
    index: false,
    follow: false,
  },
}

/** Écran public minimal : l’initiation OAuth reste une redirection GET côté API. */
export default function ConnectionPage() {
  return (
    <main className={styles.page} aria-labelledby="connection-title">
      <section className={styles.content}>
        <header className={styles.brand}>
          <img
            className={styles.logo}
            src="/branding/logo.svg"
            alt=""
          />
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

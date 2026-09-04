import type { Metadata } from 'next'
import { ConnectionView } from '../../features/authentication/connection-view'

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
  return <ConnectionView />
}

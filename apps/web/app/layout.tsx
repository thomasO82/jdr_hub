import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'JDR Hub',
  description: 'Organisez vos parties de jeu de rôle avec JDR Hub.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  )
}

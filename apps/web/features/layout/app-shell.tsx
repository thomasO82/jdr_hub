import type { ReactNode } from 'react'
import { AppHeader } from './app-header'
import { DesktopSidebar } from './desktop-sidebar'
import { MobileBottomNav } from './mobile-bottom-nav'

const activeLabels: Record<string, string> = {
  Dashboard: 'Tableau de bord',
  Games: 'Parties',
  Players: 'Joueurs',
  Schedule: 'Planning',
  Profile: 'Profil',
}

export function AppShell({ children, active = 'Parties' }: { children: ReactNode; active?: string }) {
  const activeLabel = activeLabels[active] ?? active
  return (
    <div className="min-h-screen bg-background font-body text-on-surface">
      <DesktopSidebar active={activeLabel} />
      <AppHeader />
      <div className="min-h-screen lg:ml-64">{children}</div>
      <MobileBottomNav active={activeLabel} />
    </div>
  )
}

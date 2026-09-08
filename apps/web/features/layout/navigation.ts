import {
  CalendarDays,
  CircleUserRound,
  Dices,
  LayoutDashboard,
  UsersRound,
  type LucideIcon,
} from 'lucide-react'

export type NavigationItem = {
  href: string
  label: string
  icon: LucideIcon
}

export const navigation: NavigationItem[] = [
  { href: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/parties', label: 'Parties', icon: Dices },
  { href: '/joueurs', label: 'Joueurs', icon: UsersRound },
  { href: '/planning', label: 'Planning', icon: CalendarDays },
  { href: '/profil', label: 'Profil', icon: CircleUserRound },
]

export const navLink = 'flex min-h-12 items-center gap-4 rounded-lg px-4 text-sm text-on-surface-variant transition-colors hover:bg-primary-fixed/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-reduce:transition-none'
export const activeLink = 'flex min-h-12 items-center gap-4 rounded-lg border-r-4 border-primary bg-primary-fixed px-4 text-sm font-semibold text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'
export const mobileNavLink = 'flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl px-1 text-xs text-on-surface-variant no-underline transition-colors hover:bg-primary-fixed/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-reduce:transition-none'
export const mobileActiveLink = 'flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl bg-primary-fixed px-1 text-xs font-semibold text-primary no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

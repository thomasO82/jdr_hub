import Link from 'next/link'
import {
  Bell,
  CalendarDays,
  CircleUserRound,
  Dices,
  LayoutDashboard,
  Plus,
  UsersRound,
} from 'lucide-react'
import type { ReactNode } from 'react'

const navigation = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/parties', label: 'Games', icon: Dices },
  { href: '/joueurs', label: 'Players', icon: UsersRound },
  { href: '/planning', label: 'Schedule', icon: CalendarDays },
  { href: '/profil', label: 'Profile', icon: CircleUserRound },
]

const navLink = 'flex min-h-12 items-center gap-4 rounded-lg px-4 text-sm text-on-surface-variant transition-colors hover:bg-primary-fixed/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'
const activeLink = 'flex min-h-12 items-center gap-4 rounded-lg border-r-4 border-primary bg-primary-fixed px-4 text-sm font-semibold text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

export function AppShell({ children, active = 'Games' }: { children: ReactNode; active?: string }) {
  return (
    <div className="min-h-screen bg-background font-body text-on-surface">
      <aside className="fixed inset-y-0 left-0 z-10 hidden w-64 flex-col border-r border-surface-container-highest bg-surface px-4 py-7 lg:flex" aria-label="Navigation principale">
        <Link className="flex items-center gap-3 px-2 text-on-surface no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" href="/">
          <img className="h-11 w-11" src="/branding/logo.svg" alt="JDR Hub" />
          <span>
            <strong className="block font-display text-xl leading-tight tracking-tight text-primary">JDR Hub</strong>
            <small className="mt-0.5 block font-label text-[0.6rem] uppercase tracking-wider text-on-surface-variant">Digital Dungeon Master</small>
          </span>
        </Link>
        <nav className="mt-11 grid gap-2">
          {navigation.map(({ href, label, icon: Icon }) => (
            <Link className={label === active ? activeLink : navLink} href={href} key={label}>
              <Icon aria-hidden="true" size={22} strokeWidth={1.75} />
              {label}
            </Link>
          ))}
        </nav>
        <Link className="mt-auto flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-on-primary no-underline transition-colors hover:bg-primary-container focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" href="/parties/nouvelle">
          <Plus aria-hidden="true" size={20} />
          New Game
        </Link>
      </aside>

      <header className="fixed inset-x-0 top-0 z-20 flex h-16 items-center justify-between border-b border-outline-variant bg-surface px-5 text-primary lg:hidden">
        <Link className="flex items-center gap-2 no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" href="/">
          <img className="h-8 w-8" src="/branding/logo.svg" alt="JDR Hub" />
          <strong className="font-display text-2xl tracking-tight">JDR Hub</strong>
        </Link>
        <Bell aria-label="Notifications" size={24} />
      </header>

      <div className="min-h-screen lg:ml-64">{children}</div>

      <Link className="fixed bottom-24 right-5 z-20 grid h-16 w-16 place-items-center rounded-2xl bg-primary text-on-primary shadow-lg shadow-primary/30 transition-colors hover:bg-primary-container focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary lg:hidden" href="/parties/nouvelle" aria-label="Créer une partie">
        <Plus aria-hidden="true" size={32} />
      </Link>
      <nav className="fixed inset-x-0 bottom-0 z-20 grid h-20 grid-cols-5 gap-1 border-t border-outline-variant bg-surface px-3 py-2 lg:hidden" aria-label="Navigation mobile">
        {navigation.map(({ href, label, icon: Icon }) => (
          <Link className={label === active ? 'flex flex-col items-center justify-center gap-1 rounded-xl bg-primary-fixed text-xs font-semibold text-primary no-underline' : 'flex flex-col items-center justify-center gap-1 rounded-xl text-xs text-on-surface-variant no-underline transition-colors hover:bg-primary-fixed/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'} href={href} key={label}>
            <Icon aria-hidden="true" size={22} strokeWidth={1.75} />
            <span>{label === 'Schedule' ? 'Calendar' : label}</span>
          </Link>
        ))}
      </nav>
    </div>
  )
}

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
import styles from './app-shell.module.css'

const navigation = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/parties', label: 'Games', icon: Dices },
  { href: '/joueurs', label: 'Players', icon: UsersRound },
  { href: '/planning', label: 'Schedule', icon: CalendarDays },
  { href: '/profil', label: 'Profile', icon: CircleUserRound },
]

export function AppShell({ children, active = 'Games' }: { children: ReactNode; active?: string }) {
  return (
    <div className={styles.appShell}>
      <aside className={styles.sidebar} aria-label="Navigation principale">
        <Link className={styles.brand} href="/">
          <img src="/branding/logo.svg" alt="JDR Hub" />
          <span>
            <strong>JDR Hub</strong>
            <small>Digital Dungeon Master</small>
          </span>
        </Link>
        <nav className={styles.desktopNavigation}>
          {navigation.map(({ href, label, icon: Icon }) => (
            <Link className={label === active ? styles.activeLink : styles.navLink} href={href} key={label}>
              <Icon aria-hidden="true" size={22} strokeWidth={2} />
              {label}
            </Link>
          ))}
        </nav>
        <Link className={styles.newGame} href="/parties/nouvelle"><Plus aria-hidden="true" size={20} /> New Game</Link>
      </aside>

      <header className={styles.mobileHeader}>
        <Link className={styles.mobileBrand} href="/">
          <img src="/branding/logo.svg" alt="JDR Hub" />
          <strong>JDR Hub</strong>
        </Link>
        <Bell aria-label="Notifications" size={24} />
      </header>

      <div className={styles.main}>{children}</div>

      <button className={styles.mobileFab} type="button" aria-label="Créer une partie"><Plus aria-hidden="true" size={32} /></button>
      <nav className={styles.bottomNavigation} aria-label="Navigation mobile">
        {navigation.map(({ href, label, icon: Icon }) => (
          <Link className={label === active ? styles.mobileActiveLink : styles.mobileNavLink} href={href} key={label}>
            <Icon aria-hidden="true" size={22} />
            <span>{label === 'Games' ? 'Games' : label === 'Schedule' ? 'Calendar' : label}</span>
          </Link>
        ))}
      </nav>
    </div>
  )
}

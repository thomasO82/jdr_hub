import Link from 'next/link'
import { Plus } from 'lucide-react'
import { activeLink, navigation, navLink } from './navigation'

export function DesktopSidebar({ active }: { active: string }) {
  return <aside className="fixed inset-y-0 left-0 z-10 hidden w-64 flex-col border-r border-surface-container-highest bg-surface px-4 py-7 lg:flex" aria-label="Navigation principale">
    <Link className="flex items-center gap-3 px-2 text-on-surface no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" href="/">
      <img className="h-11 w-11" src="/branding/logo.svg" alt="JDR Hub" />
      <span>
        <strong className="block font-display text-xl leading-tight tracking-tight text-primary">JDR Hub</strong>
        <small className="mt-0.5 block font-label text-xs uppercase tracking-wider text-on-surface-variant">Digital Dungeon Master</small>
      </span>
    </Link>
    <nav className="mt-11 grid gap-2">
      {navigation.map(({ href, label, icon: Icon }) => (
        <Link aria-current={label === active ? 'page' : undefined} className={label === active ? activeLink : navLink} href={href} key={label}>
          <Icon aria-hidden="true" size={22} strokeWidth={1.75} />
          {label}
        </Link>
      ))}
    </nav>
    <Link className="mt-auto flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary font-semibold text-on-primary no-underline transition-colors hover:bg-primary-container focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-reduce:transition-none" href="/parties/nouvelle">
      <Plus aria-hidden="true" size={20} />
      Créer une partie
    </Link>
  </aside>
}

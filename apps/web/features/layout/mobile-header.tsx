import Link from 'next/link'
import { NotificationBell } from '../notifications/notification-bell'

export function MobileHeader() {
  return <header className="fixed inset-x-0 top-0 z-20 flex h-16 items-center justify-between border-b border-outline-variant bg-surface px-5 text-primary lg:hidden" aria-label="Actions globales">
    <Link className="flex items-center gap-2 no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" href="/">
      <img className="h-8 w-8" src="/branding/logo.svg" alt="JDR Hub" />
      <strong className="font-display text-2xl tracking-tight">JDR Hub</strong>
    </Link>
    <NotificationBell />
  </header>
}

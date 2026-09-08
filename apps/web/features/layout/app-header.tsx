import { NotificationBell } from '../notifications/notification-bell'
import { MobileHeader } from './mobile-header'

export function AppHeader() {
  return <>
    <header className="sticky top-0 z-20 hidden h-16 items-center justify-end border-b border-outline-variant bg-surface px-8 text-primary lg:ml-64 lg:flex" aria-label="Actions globales">
      <NotificationBell />
    </header>
    <MobileHeader />
  </>
}

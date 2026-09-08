import Link from 'next/link'
import { Plus } from 'lucide-react'
import { mobileActiveLink, mobileNavLink, navigation } from './navigation'

export function MobileBottomNav({ active }: { active: string }) {
  return <>
    <Link className="fixed bottom-24 right-5 z-20 grid h-16 w-16 place-items-center rounded-2xl bg-primary text-on-primary shadow-lg shadow-primary/30 transition-colors hover:bg-primary-container focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-reduce:transition-none lg:hidden" href="/parties/nouvelle" aria-label="Créer une partie">
      <Plus aria-hidden="true" size={32} />
    </Link>
    <nav className="fixed inset-x-0 bottom-0 z-20 grid h-20 grid-cols-5 gap-1 border-t border-outline-variant bg-surface px-3 py-2 lg:hidden" aria-label="Navigation mobile">
      {navigation.map(({ href, label, icon: Icon }) => (
        <Link aria-current={label === active ? 'page' : undefined} className={label === active ? mobileActiveLink : mobileNavLink} href={href} key={label}>
          <Icon aria-hidden="true" size={22} strokeWidth={1.75} />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  </>
}

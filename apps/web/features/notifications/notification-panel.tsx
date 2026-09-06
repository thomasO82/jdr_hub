import Link from 'next/link'
import { Bell, Check, ExternalLink, LoaderCircle } from 'lucide-react'
import type { NotificationsPage } from '@jdr-hub/shared'

type NotificationPanelProps = {
  page: NotificationsPage | null
  loading: boolean
  error: string | null
  onRetry: () => void
  onRead: (id: string) => void
}

function dateLabel(value: string): string {
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

export function NotificationPanel({ page, loading, error, onRetry, onRead }: NotificationPanelProps) {
  return <section aria-label="Notifications" className="absolute right-0 top-14 z-30 w-72 overflow-hidden rounded-xl border border-outline-variant bg-surface shadow-xl shadow-primary/10 sm:w-88" id="notifications-panel" role="dialog">
    <header className="flex items-center justify-between border-b border-outline-variant/60 px-4 py-3">
      <div className="flex items-center gap-2"><Bell aria-hidden="true" className="text-primary" size={18} /><h2 className="m-0 font-display text-lg font-semibold text-on-surface">Notifications</h2></div>
      {page && page.unreadCount > 0 ? <span className="rounded-full bg-primary-fixed px-2 py-1 font-label text-xs font-bold text-primary">{page.unreadCount} non lue{page.unreadCount > 1 ? 's' : ''}</span> : null}
    </header>
    {loading ? <div className="flex items-center gap-2 px-4 py-8 text-sm text-on-surface-variant" role="status"><LoaderCircle aria-hidden="true" className="animate-spin" size={18} />Chargement des notifications…</div> : null}
    {error ? <div className="grid gap-3 px-4 py-6 text-sm text-on-surface-variant" role="alert"><p className="m-0">{error}</p><button className="min-h-12 justify-self-start rounded-lg border border-outline-variant px-3 font-semibold text-primary transition-colors hover:bg-primary-fixed/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" onClick={onRetry} type="button">Réessayer</button></div> : null}
    {!loading && !error && page && page.items.length === 0 ? <div className="grid justify-items-center gap-2 px-4 py-8 text-center text-sm text-on-surface-variant"><Bell aria-hidden="true" className="text-primary" size={24} /><p className="m-0">Aucune notification pour le moment.</p></div> : null}
    {!loading && !error && page && page.items.length > 0 ? <ul className="m-0 max-h-96 divide-y divide-outline-variant/50 overflow-y-auto p-0">
      {page.items.map((notification) => <li className={notification.readAt ? 'bg-surface' : 'bg-primary-fixed/30'} key={notification.id}>
        <div className="grid gap-2 px-4 py-4">
          <div className="flex items-start justify-between gap-3"><p className="m-0 font-semibold text-on-surface">{notification.title}</p>{notification.readAt ? <Check aria-label="Notification lue" className="shrink-0 text-on-surface-variant" size={16} /> : <span aria-label="Notification non lue" className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />}</div>
          <p className="m-0 text-sm leading-5 text-on-surface-variant">{notification.body}</p>
          <time className="font-label text-xs text-on-surface-variant" dateTime={notification.createdAt}>{dateLabel(notification.createdAt)}</time>
          <div className="flex items-center justify-between gap-3"><Link className="inline-flex min-h-12 items-center gap-1 rounded-lg text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" href={`/planning#session-${encodeURIComponent(notification.sessionId)}`} onClick={() => { if (!notification.readAt) onRead(notification.id) }}>Voir la séance <ExternalLink aria-hidden="true" size={14} /></Link>{notification.readAt ? null : <button className="min-h-12 rounded-lg px-2 text-sm text-on-surface-variant hover:bg-surface-container focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" onClick={() => onRead(notification.id)} type="button">Marquer comme lue</button>}</div>
        </div>
      </li>)}
    </ul> : null}
  </section>
}

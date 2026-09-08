'use client'

import Link from 'next/link'
import { ArrowRight, Bell, Check } from 'lucide-react'
import { useState } from 'react'
import type { DashboardNotificationSummary } from '@jdr-hub/shared'
import { NOTIFICATIONS_ERROR } from '../../lib/notifications-api'

function dateLabel(value: string): string {
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

export function NotificationSummary({ initial, onRead, className = '' }: { initial: DashboardNotificationSummary; onRead: (id: string) => Promise<void>; className?: string }) {
  const [summary, setSummary] = useState(initial)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (summary.unreadCount <= 0) return null

  const markRead = async (id: string) => {
    setPendingId(id)
    setError(null)
    try {
      await onRead(id)
      setSummary((current) => ({ unreadCount: Math.max(0, current.unreadCount - 1), items: current.items.filter((item) => item.id !== id) }))
    } catch {
      setError(NOTIFICATIONS_ERROR)
    } finally {
      setPendingId(null)
    }
  }

  return (
    <section aria-labelledby="dashboard-notifications-title" className={`rounded-xl border border-primary/30 bg-primary-fixed/30 p-5 shadow-sm ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Bell aria-hidden="true" className="shrink-0 text-primary" size={20} />
          <h2 className="m-0 font-display text-xl font-semibold text-on-surface" id="dashboard-notifications-title">À traiter</h2>
        </div>
        <span aria-live="polite" className="rounded-full bg-primary px-2 py-1 font-label text-xs font-bold text-on-primary">{summary.unreadCount} non lue{summary.unreadCount > 1 ? 's' : ''}</span>
      </div>
      <ul className="mt-4 grid gap-3">
        {summary.items.map((notification) => (
          <li className="rounded-lg border border-primary/20 bg-surface p-3" key={notification.id}>
            <div className="flex items-start justify-between gap-3">
              <p className="m-0 font-semibold text-on-surface">{notification.title}</p>
              <span aria-label="Notification non lue" className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
            </div>
            <p className="m-0 mt-1 text-sm leading-5 text-on-surface-variant">{notification.body}</p>
            <time className="mt-2 block font-label text-xs text-on-surface-variant" dateTime={notification.createdAt}>{dateLabel(notification.createdAt)}</time>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <Link className="inline-flex min-h-12 items-center gap-1 text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" href={`/planning#session-${encodeURIComponent(notification.sessionId)}`} onClick={() => { void markRead(notification.id) }}>Voir la séance <ArrowRight aria-hidden="true" size={14} /></Link>
              <button className="inline-flex min-h-12 items-center gap-1 rounded-lg px-2 text-sm text-on-surface-variant hover:bg-surface-container focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-wait disabled:opacity-60" disabled={pendingId === notification.id} onClick={() => { void markRead(notification.id) }} type="button">
                <Check aria-hidden="true" size={14} />
                {pendingId === notification.id ? 'Enregistrement…' : 'Marquer comme lue'}
              </button>
            </div>
          </li>
        ))}
      </ul>
      {error ? <p className="m-0 mt-3 text-sm text-error" role="alert">{error}</p> : null}
      <p className="m-0 mt-3 text-xs text-on-surface-variant">La cloche du header permet de consulter l’historique complet.</p>
    </section>
  )
}

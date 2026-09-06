'use client'

import { Bell } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { NotificationsPage } from '@jdr-hub/shared'
import { createNotificationsApi, NOTIFICATIONS_ERROR } from '../../lib/notifications-api'
import { NotificationPanel } from './notification-panel'

export function NotificationBell({ className = '' }: { className?: string }) {
  const [open, setOpen] = useState(false)
  const [page, setPage] = useState<NotificationsPage | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [api] = useState(() => createNotificationsApi())

  async function load(): Promise<void> {
    setLoading(true)
    setError(null)
    try {
      setPage(await api.getNotifications({ limit: 20 }))
    } catch {
      setError(NOTIFICATIONS_ERROR)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open && page === null && !loading && !error) void load()
  }, [open, page, loading, error])

  useEffect(() => {
    if (!open) return
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [open])

  async function markRead(id: string): Promise<void> {
    try {
      await api.markNotificationRead(id)
      setPage((current) => current ? { ...current, unreadCount: Math.max(0, current.unreadCount - 1), items: current.items.map((item) => item.id === id && !item.readAt ? { ...item, readAt: new Date().toISOString() } : item) } : current)
    } catch {
      setError(NOTIFICATIONS_ERROR)
    }
  }

  const unreadCount = page?.unreadCount ?? 0
  return <div className={`relative ${className}`}>
    <button aria-controls="notifications-panel" aria-expanded={open} aria-haspopup="dialog" aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} non lue${unreadCount > 1 ? 's' : ''}` : 'Notifications'} className="relative grid min-h-12 min-w-12 place-items-center rounded-lg text-primary transition-colors hover:bg-primary-fixed/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" onClick={() => setOpen((current) => !current)} type="button">
      <Bell aria-hidden="true" size={22} />
      {unreadCount > 0 ? <span aria-hidden="true" className="absolute right-1 top-1 min-w-5 rounded-full bg-primary px-1 font-label text-xs font-bold leading-5 text-on-primary">{unreadCount > 99 ? '99+' : unreadCount}</span> : null}
    </button>
    {open ? <NotificationPanel error={error} loading={loading} onRead={(id) => { void markRead(id) }} onRetry={() => { void load() }} page={page} /> : null}
  </div>
}

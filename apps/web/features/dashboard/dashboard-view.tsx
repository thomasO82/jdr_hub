'use client'

import { CalendarDays, CircleAlert, Gamepad2 } from 'lucide-react'
import { useState } from 'react'
import type { DashboardData } from '@jdr-hub/shared'
import { createNotificationsApi } from '../../lib/notifications-api'
import { AppShell } from '../layout/app-shell'
import { NotificationSummary } from '../notifications/notification-summary'
import { DashboardCard } from './dashboard-card'

function dateLabel(value: string): string {
  return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'full', timeStyle: 'short' }).format(new Date(value))
}

function blockError(label: string) {
  return <div className="flex items-start gap-3 rounded-lg border border-error/30 bg-error-container p-4 text-sm text-on-error-container"><CircleAlert aria-hidden="true" className="mt-0.5 shrink-0" size={18} /><p className="m-0">{label} est momentanément indisponible. Réessayez dans un instant.</p></div>
}

export function DashboardView({ initial }: { initial: DashboardData }) {
  const [notificationsApi] = useState(() => createNotificationsApi())
  const notificationSummary = initial.notifications.status === 'READY' ? initial.notifications.data : null

  const markNotificationRead = async (id: string) => {
    await notificationsApi.markNotificationRead(id)
  }

  return (
    <AppShell active="Dashboard">
      <main className="min-h-screen bg-background px-5 pb-28 pt-24 font-body text-on-surface md:px-8 md:pb-12 md:pt-10 lg:px-10">
        <section className="mx-auto max-w-7xl" aria-labelledby="dashboard-title">
          <header className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="m-0 font-label text-xs font-bold uppercase tracking-wider text-primary">JDR Hub</p>
              <h1 className="m-0 mt-2 font-display text-4xl font-semibold tracking-tight" id="dashboard-title">Tableau de bord</h1>
              <p className="m-0 mt-2 text-on-surface-variant">Retrouvez vos prochaines actions et vos parties en cours.</p>
            </div>
            <a className="hidden min-h-12 items-center rounded-xl bg-primary px-5 font-semibold text-on-primary no-underline shadow-sm hover:bg-primary-container focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary lg:inline-flex" href="/parties/nouvelle">Créer une partie</a>
          </header>

          <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <DashboardCard className="lg:col-start-1 lg:row-start-1" title="Prochaine séance">
              {initial.nextSession.status === 'ERROR' ? blockError('La prochaine séance') : initial.nextSession.status === 'EMPTY' ? <p className="m-0 text-sm text-on-surface-variant">Aucune séance planifiée pour le moment.</p> : (
                <div className="grid gap-3">
                  <div className="flex items-start gap-3">
                    <CalendarDays aria-hidden="true" className="mt-1 shrink-0 text-primary" size={22} />
                    <div><p className="m-0 font-display text-2xl font-semibold">{initial.nextSession.data.gameTitle}</p><p className="m-0 mt-1 text-sm text-on-surface-variant">{dateLabel(initial.nextSession.data.startsAt)}</p></div>
                  </div>
                  <p className="m-0 text-sm text-on-surface-variant">{initial.nextSession.data.role === 'GM' ? 'Vous êtes le maître de jeu.' : 'Vous participez à cette séance.'}</p>
                  {initial.nextSession.data.canReportAbsence ? <a className="inline-flex min-h-12 items-center justify-center rounded-lg border border-outline-variant px-4 text-sm font-semibold text-on-surface no-underline hover:bg-surface-container focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" href={`/planning#session-${encodeURIComponent(initial.nextSession.data.id)}`}>Gérer ma présence</a> : null}
                </div>
              )}
            </DashboardCard>

            {notificationSummary ? <NotificationSummary className="lg:col-start-2 lg:row-start-1" initial={notificationSummary} onRead={markNotificationRead} /> : null}

            <DashboardCard className="lg:col-start-1 lg:row-start-2" title="Parties actives">
              {initial.activeGames.status === 'ERROR' ? blockError('Les parties actives') : initial.activeGames.status === 'EMPTY' || initial.activeGames.data.length === 0 ? <p className="m-0 text-sm text-on-surface-variant">Aucune partie active pour le moment.</p> : <ul className="grid gap-3">{initial.activeGames.data.map((game) => <li className="flex items-center gap-3 rounded-lg border border-outline-variant/60 p-3" key={game.id}><Gamepad2 aria-hidden="true" className="shrink-0 text-primary" size={20} /><div><p className="m-0 font-semibold text-on-surface">{game.title}</p><p className="m-0 mt-1 font-label text-xs text-on-surface-variant">{game.system} · {game.role === 'GM' ? 'MJ' : 'Joueur'}</p></div></li>)}</ul>}
            </DashboardCard>

            <DashboardCard className="lg:col-start-2 lg:row-start-2" title="Progression">
              <p className="m-0 text-sm text-on-surface-variant">Votre progression apparaîtra ici lorsque le suivi d’XP sera disponible.</p>
            </DashboardCard>
          </div>
        </section>
      </main>
    </AppShell>
  )
}

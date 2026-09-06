import { Clock3, UserRound } from 'lucide-react'
import type { PlanningSession } from '@jdr-hub/shared'

function time(value: string): string {
  return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

export function SessionCard({ session, onReportAbsence }: { session: PlanningSession; onReportAbsence?: () => void }) {
  return <article className="rounded-xl border border-outline-variant/40 bg-surface p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div><h3 className="m-0 font-display text-lg font-semibold">{session.gameTitle}</h3><p className="m-0 mt-1 flex items-center gap-1 text-sm text-on-surface-variant"><Clock3 aria-hidden="true" size={14} />{time(session.startsAt)} – {time(session.endsAt)}</p></div><span className={session.status === 'SCHEDULED' ? 'rounded-full bg-primary-fixed px-2 py-1 text-xs font-semibold text-primary' : 'rounded-full bg-surface-container px-2 py-1 text-xs text-on-surface-variant'}>{session.status === 'SCHEDULED' ? 'Confirmée' : 'En attente'}</span></div><div className="mt-3 flex flex-wrap items-center justify-between gap-3"><p className="m-0 flex items-center gap-1 text-sm text-on-surface-variant"><UserRound aria-hidden="true" size={14} />Planning de la partie</p>{onReportAbsence && session.status === 'SCHEDULED' ? <button className="min-h-12 rounded-lg px-2 text-sm font-semibold text-primary hover:bg-primary-fixed/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" onClick={onReportAbsence} type="button">Signaler une absence</button> : null}</div></article>
}

import type { PlanningSession } from '@jdr-hub/shared'
import { SessionCard } from './session-card'

const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

function monthDays(month: Date): Date[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1)
  const offset = (first.getDay() + 6) % 7
  return Array.from({ length: 42 }, (_, index) => new Date(month.getFullYear(), month.getMonth(), index - offset + 1))
}

function sameDay(left: Date, right: Date): boolean {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate()
}

export function MonthCalendar({ month, sessions }: { month: Date; sessions: PlanningSession[] }) {
  const days = monthDays(month)
  return <div className="hidden overflow-hidden rounded-xl border border-outline-variant/40 bg-surface shadow-sm lg:block"><div className="grid grid-cols-7 border-b border-outline-variant/40">{weekDays.map((day) => <div className="p-3 text-center text-xs font-semibold uppercase tracking-wide text-on-surface-variant" key={day}>{day}</div>)}</div><div className="grid grid-cols-7">{days.map((day) => { const daySessions = sessions.filter((session) => sameDay(new Date(session.startsAt), day)); const inMonth = day.getMonth() === month.getMonth(); return <div className={inMonth ? 'min-h-28 border-b border-r border-outline-variant/30 p-2' : 'min-h-28 border-b border-r border-outline-variant/20 bg-surface-container-low p-2 text-on-surface-variant/60'} key={day.toISOString()}><span className="text-sm font-medium">{day.getDate()}</span><div className="mt-2 grid gap-1">{daySessions.map((session) => <div className="rounded-md border-l-4 border-primary bg-primary-fixed/70 px-2 py-1 text-xs text-primary" key={session.id}><span className="block truncate font-semibold">{session.gameTitle}</span><span>{new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(session.startsAt))}</span></div>)}</div></div> })}</div><div className="mt-4 grid gap-3 p-4 lg:hidden">{sessions.map((session) => <SessionCard key={session.id} session={session} />)}</div></div>
}


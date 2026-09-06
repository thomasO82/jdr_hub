import type { Application } from '@jdr-hub/shared'
import { CheckCircle2, Clock3, XCircle } from 'lucide-react'

const statusContent = {
  PENDING: { icon: Clock3, title: 'Candidature envoyée', message: 'En attente de réponse du MJ.' },
  ACCEPTED: { icon: CheckCircle2, title: 'Candidature acceptée', message: 'Vous avez rejoint le groupe.' },
  REJECTED: { icon: XCircle, title: 'Candidature refusée', message: 'Le MJ n’a pas retenu cette candidature.' },
} as const

export function ApplicationStatus({ application }: { application: Application }) {
  const content = statusContent[application.status]
  const Icon = content.icon
  return <div aria-live="polite" className="mt-4 rounded-xl border-2 border-primary-fixed-dim bg-primary-fixed/70 p-4 text-left" role="status"><div className="flex items-start gap-3"><Icon aria-hidden="true" className="mt-0.5 shrink-0 text-primary" size={22} /><div><p className="m-0 font-display text-base font-semibold text-primary">{content.title}</p><p className="m-0 mt-1 font-body text-sm font-medium text-on-surface">{content.message}</p></div></div></div>
}

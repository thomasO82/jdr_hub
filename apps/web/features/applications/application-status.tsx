import type { Application } from '@jdr-hub/shared'

const labels = { PENDING: 'En attente', ACCEPTED: 'Acceptée', REJECTED: 'Refusée' } as const

export function ApplicationStatus({ application }: { application: Application }) {
  return <div className="mt-4 rounded-lg border border-primary-fixed-dim bg-primary-fixed/60 p-3 text-left"><p className="m-0 font-label text-xs font-bold uppercase tracking-wider text-primary">Candidature {labels[application.status]}</p><p className="m-0 mt-1 text-sm text-on-surface-variant">{application.status === 'PENDING' ? 'Le MJ examinera votre demande prochainement.' : application.status === 'ACCEPTED' ? 'Vous avez rejoint le groupe.' : 'Le MJ n’a pas retenu cette candidature.'}</p></div>
}

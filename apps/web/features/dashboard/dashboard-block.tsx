import { AlertCircle, LoaderCircle } from 'lucide-react'
import type { DashboardBlock as DashboardBlockData } from '@jdr-hub/shared'

type DashboardBlockProps<T> = {
  block: DashboardBlockData<T>
  title: string
  emptyMessage: string
  onRetry?: () => void
  children: (data: T) => React.ReactNode
}

export function DashboardBlock<T>({ block, title, emptyMessage, onRetry, children }: DashboardBlockProps<T>) {
  if (block.status === 'ERROR') {
    return <section aria-labelledby={`${title}-error`} className="grid gap-3 rounded-xl border border-error/30 bg-error-container/40 p-5" role="alert"><div className="flex items-start gap-3"><AlertCircle aria-hidden="true" className="mt-0.5 shrink-0 text-error" size={20} /><div><h2 className="m-0 font-display text-lg font-semibold" id={`${title}-error`}>{title}</h2><p className="m-0 mt-1 text-sm text-on-surface-variant">{block.error?.message ?? 'Ce bloc est momentanément indisponible.'}</p></div></div>{onRetry ? <button className="min-h-12 justify-self-start rounded-lg border border-error/40 px-4 text-sm font-semibold text-error transition-colors hover:bg-error/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" onClick={onRetry} type="button">Réessayer</button> : null}</section>
  }
  if (block.status === 'EMPTY' || block.data === null) {
    return <section aria-labelledby={`${title}-empty`} className="rounded-xl border border-dashed border-outline-variant bg-surface p-5"><h2 className="m-0 font-display text-lg font-semibold" id={`${title}-empty`}>{title}</h2><p className="m-0 mt-2 text-sm text-on-surface-variant">{emptyMessage}</p></section>
  }
  return <section aria-labelledby={`${title}-ready`} className="rounded-xl border border-outline-variant/60 bg-surface p-5 shadow-sm"><h2 className="m-0 font-display text-lg font-semibold" id={`${title}-ready`}>{title}</h2><div className="mt-4">{children(block.data)}</div></section>
}

export function DashboardLoading() {
  return <div className="grid gap-5" role="status" aria-label="Chargement du tableau de bord"><div className="h-44 animate-pulse rounded-2xl bg-surface-container" /><div className="grid gap-5 md:grid-cols-2"><div className="h-36 animate-pulse rounded-xl bg-surface-container" /><div className="h-36 animate-pulse rounded-xl bg-surface-container" /></div><span className="sr-only">Chargement du tableau de bord…</span></div>
}

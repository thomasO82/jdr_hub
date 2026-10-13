import type { DashboardBlock as DashboardBlockData } from '@jdr-hub/shared'
import { EmptyState, ErrorState, LoadingState } from '../ui/async-state'

type DashboardBlockProps<T> = {
  block: DashboardBlockData<T>
  title: string
  emptyMessage: string
  onRetry?: () => void
  children: (data: T) => React.ReactNode
}

export function DashboardBlock<T>({ block, title, emptyMessage, onRetry, children }: DashboardBlockProps<T>) {
  if (block.status === 'ERROR') {
    return <section aria-labelledby={`${title}-error`} className="rounded-xl border border-error/30 bg-error-container/40 p-5"><ErrorState message={block.error?.message ?? 'Ce bloc est momentanément indisponible.'} onRetry={onRetry} title={title} /></section>
  }
  if (block.status === 'EMPTY' || block.data === null) {
    return <section aria-labelledby={`${title}-empty`} className="rounded-xl border border-dashed border-outline-variant bg-surface p-5"><EmptyState message={emptyMessage} title={title} /></section>
  }
  return <section aria-labelledby={`${title}-ready`} className="rounded-xl border border-outline-variant/60 bg-surface p-5 shadow-sm"><h2 className="m-0 font-display text-lg font-semibold" id={`${title}-ready`}>{title}</h2><div className="mt-4">{children(block.data)}</div></section>
}

export function DashboardLoading() {
  return <LoadingState label="Chargement du tableau de bord"><div className="grid gap-5"><div className="h-44 animate-pulse rounded-2xl bg-surface-container motion-reduce:animate-none" /><div className="grid gap-5 md:grid-cols-2"><div className="h-36 animate-pulse rounded-xl bg-surface-container motion-reduce:animate-none" /><div className="h-36 animate-pulse rounded-xl bg-surface-container motion-reduce:animate-none" /></div></div></LoadingState>
}

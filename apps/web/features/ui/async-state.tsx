import { AlertCircle } from 'lucide-react'
import type { ReactNode } from 'react'

type LoadingStateProps = {
  label: string
  children?: ReactNode
}

type ErrorStateProps = {
  title: string
  message: string
  onRetry?: (() => void) | undefined
}

type EmptyStateProps = {
  title: string
  message: string
}

export function LoadingState({ label, children }: LoadingStateProps) {
  return <div aria-label={label} role="status">
    <span className="sr-only">{label}…</span>
    {children}
  </div>
}

export function ErrorState({ title, message, onRetry }: ErrorStateProps) {
  return <div className="grid gap-3" role="alert">
    <div className="flex items-start gap-3">
      <AlertCircle aria-hidden="true" className="mt-0.5 shrink-0 text-error" size={20} />
      <div>
        <h2 className="m-0 font-display text-lg font-semibold">{title}</h2>
        <p className="m-0 mt-1 text-sm text-on-surface-variant">{message}</p>
      </div>
    </div>
    {onRetry ? <button className="min-h-12 justify-self-start rounded-lg border border-error/40 px-4 text-sm font-semibold text-error transition-colors hover:bg-error/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-reduce:transition-none" onClick={onRetry} type="button">Réessayer</button> : null}
  </div>
}

export function EmptyState({ title, message }: EmptyStateProps) {
  return <div>
    <h2 className="m-0 font-display text-lg font-semibold">{title}</h2>
    <p className="m-0 mt-2 text-sm text-on-surface-variant">{message}</p>
  </div>
}

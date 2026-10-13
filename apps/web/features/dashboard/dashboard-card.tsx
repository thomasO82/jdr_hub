import type { ReactNode } from 'react'

export function DashboardCard({ title, children, className = '' }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-outline-variant/40 bg-surface p-5 shadow-sm ${className}`}>
      <h2 className="m-0 font-display text-xl font-semibold text-on-surface">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  )
}

'use client'

import { useId, useState, type ReactNode } from 'react'

export function FiltersToggle({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(true)
  const filtersId = useId()

  return (
    <div className="mt-4">
      <button className="mb-2 hidden border-0 bg-transparent p-0 font-body text-sm font-semibold text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary max-md:block" type="button" aria-controls={filtersId} aria-expanded={visible} onClick={() => setVisible((current) => !current)}>
        {visible ? 'Masquer les filtres' : 'Afficher les filtres'}
      </button>
      {visible && <div className="grid gap-5" id={filtersId}>{children}</div>}
    </div>
  )
}

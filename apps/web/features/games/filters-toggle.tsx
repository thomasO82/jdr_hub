'use client'

import { useId, useState, type ReactNode } from 'react'
import styles from './games-view.module.css'

export function FiltersToggle({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(true)
  const filtersId = useId()

  return (
    <div className={styles.filterPanelContainer}>
      <button
        className={styles.filterToggle}
        type="button"
        aria-controls={filtersId}
        aria-expanded={visible}
        onClick={() => setVisible((current) => !current)}
      >
        {visible ? 'Masquer les filtres' : 'Afficher les filtres'}
      </button>
      {visible && <div className={styles.filterPanel} id={filtersId}>{children}</div>}
    </div>
  )
}

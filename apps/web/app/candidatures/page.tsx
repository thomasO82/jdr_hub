'use client'

import { useEffect, useState } from 'react'
import type { Application } from '@jdr-hub/shared'
import { ApplicationsListView } from '../../features/applications/applications-list-view'
import { createApplicationsApi } from '../../lib/applications-api'

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[] | null>(null)
  useEffect(() => { void createApplicationsApi().listMine().then(setApplications) }, [])
  if (!applications) return <p className="p-8 font-body text-on-surface-variant" role="status">Chargement des candidatures…</p>
  return <ApplicationsListView applications={applications} />
}

'use client'

import { useEffect, useState } from 'react'
import type { Application } from '@jdr-hub/shared'
import { ApplicationsListView } from '../../../../../features/applications/applications-list-view'
import { createApplicationsApi } from '../../../../../lib/applications-api'
import { AppShell } from '../../../../../features/layout/app-shell'

type PageProps = { params: Promise<{ id: string }> }

export default function ManageApplicationsPage({ params }: PageProps) {
  const [applications, setApplications] = useState<Application[] | null>(null)
  useEffect(() => { void params.then(({ id }) => createApplicationsApi().listForGame(id).then(setApplications)) }, [params])
  if (!applications) return <AppShell active="Games"><p className="min-h-screen p-8 pt-24 font-body text-on-surface-variant" role="status">Chargement des candidatures…</p></AppShell>
  return <ApplicationsListView applications={applications} canDecide />
}

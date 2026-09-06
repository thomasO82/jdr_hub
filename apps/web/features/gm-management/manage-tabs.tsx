export type ManagementTab = 'applications' | 'invitations' | 'roster' | 'sessions'

const tabs: Array<{ id: ManagementTab; label: string }> = [
  { id: 'applications', label: 'Candidatures' },
  { id: 'invitations', label: 'Invitations' },
  { id: 'roster', label: 'Groupe' },
  { id: 'sessions', label: 'Séances' },
]

export function ManageTabs({ active, onChange }: { active: ManagementTab; onChange: (tab: ManagementTab) => void }) {
  return <div className="flex gap-2 overflow-x-auto border-b border-outline-variant pb-2" role="tablist" aria-label="Sections de gestion">{tabs.map((tab) => <button aria-controls={`management-panel-${tab.id}`} aria-selected={active === tab.id} className={active === tab.id ? 'min-h-12 whitespace-nowrap rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary' : 'min-h-12 whitespace-nowrap rounded-lg px-4 text-sm font-semibold text-on-surface-variant transition-colors hover:bg-primary-fixed/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'} id={`management-tab-${tab.id}`} key={tab.id} onClick={() => onChange(tab.id)} role="tab" type="button">{tab.label}</button>)}</div>
}

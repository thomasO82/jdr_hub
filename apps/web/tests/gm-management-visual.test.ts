import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')

describe('GM management visual structure', () => {
  it('provides accessible tabs, invitation actions and roster controls', () => {
    const view = read('../features/gm-management/gm-management-view.tsx')
    const tabs = read('../features/gm-management/manage-tabs.tsx')
    const roster = read('../features/gm-management/roster-panel.tsx')
    const invitations = read('../features/gm-management/invitations-panel.tsx')
    expect(view).toContain('<AppShell')
    expect(view).toContain('Gestion de la partie')
    expect(view).toContain('lg:grid-cols')
    expect(view).toContain('overflow-x-auto')
    expect(tabs).toContain('role="tablist"')
    expect(tabs).toContain('aria-selected')
    expect(tabs).toContain('focus-visible:')
    expect(roster).toContain('Retirer')
    expect(roster).toContain('aria-live')
    expect(invitations).toContain('Inviter')
    expect(invitations).toContain('Annuler')
    expect(`${view}\n${roster}\n${invitations}`).not.toContain('style={{')
  })

  it('keeps the management route and shared candidature shell present', () => {
    expect(read('../app/gestion/parties/[id]/page.tsx')).toContain('GmManagementView')
    expect(read('../app/gestion/parties/[id]/candidatures/page.tsx')).toContain('AppShell')
  })
})

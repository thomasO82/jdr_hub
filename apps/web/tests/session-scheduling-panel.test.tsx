import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { SessionSchedulingPanel } from '../features/gm-management/session-scheduling-panel.js'

describe('SessionSchedulingPanel', () => {
  it('starts by asking the GM to choose one scheduling mode', () => {
    const html = renderToStaticMarkup(createElement(SessionSchedulingPanel, {
      gameId: 'game-1',
      gameType: 'ONE_SHOT',
      nextSession: null,
      openProposalCount: 0,
    }))

    expect(html).toContain('Choisir le mode de planification')
    expect(html).toContain('Date fixe')
    expect(html).toContain('Proposer des créneaux')
    expect(html).not.toContain('Séance à date fixe')
    expect(html).not.toContain('Créneau 1')
    expect(html).not.toContain('type="datetime-local"')
    expect(html).toContain('role="status"')
  })
})

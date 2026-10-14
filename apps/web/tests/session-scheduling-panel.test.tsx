import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { SessionSchedulingPanel } from '../features/gm-management/session-scheduling-panel.js'

describe('SessionSchedulingPanel', () => {
  it('offers fixed-date and player-vote scheduling controls', () => {
    const html = renderToStaticMarkup(createElement(SessionSchedulingPanel, {
      gameId: 'game-1',
      gameType: 'ONE_SHOT',
      nextSession: null,
      openProposalCount: 0,
    }))

    expect(html).toContain('Séance à date fixe')
    expect(html).toContain('Proposer des créneaux aux joueurs')
    expect(html.match(/type="datetime-local"/g)?.length).toBeGreaterThanOrEqual(4)
    expect(html).toContain('role="status"')
  })
})

import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { SessionSchedulingPanel } from '../features/gm-management/session-scheduling-panel.js'
import { canManageSession, groupProposalRounds, proposalRoundLabel } from '../features/gm-management/session-scheduling-view.js'

describe('SessionSchedulingPanel', () => {
  it('groups historical proposals by round and labels each round status', () => {
    const proposals = [
      { id: 'proposal-a', gameId: 'game-1', roundId: 'round-1', roundStatus: 'SELECTED' as const, startsAt: '2026-10-20T18:00:00.000Z', endsAt: '2026-10-20T21:00:00.000Z', status: 'CLOSED' as const, votes: { yes: 1, maybe: 0, no: 0 }, userVote: 'YES' as const },
      { id: 'proposal-b', gameId: 'game-1', roundId: 'round-2', roundStatus: 'OPEN' as const, startsAt: '2026-10-21T18:00:00.000Z', endsAt: '2026-10-21T21:00:00.000Z', status: 'OPEN' as const, votes: { yes: 0, maybe: 1, no: 0 }, userVote: 'MAYBE' as const },
      { id: 'proposal-c', gameId: 'game-1', roundId: 'round-1', roundStatus: 'SELECTED' as const, startsAt: '2026-10-22T18:00:00.000Z', endsAt: '2026-10-22T21:00:00.000Z', status: 'SELECTED' as const, votes: { yes: 2, maybe: 0, no: 0 }, userVote: 'YES' as const },
    ]

    expect(groupProposalRounds(proposals)).toEqual([
      { roundId: 'round-1', status: 'SELECTED', proposals: [proposals[0], proposals[2]] },
      { roundId: 'round-2', status: 'OPEN', proposals: [proposals[1]] },
    ])
    expect(proposalRoundLabel('OPEN')).toBe('Vote en cours')
    expect(proposalRoundLabel('SELECTED')).toBe('Créneau retenu')
    expect(proposalRoundLabel('CANCELLED')).toBe('Séance annulée')
  })

  it('allows management actions only for scheduled sessions', () => {
    expect(canManageSession('SCHEDULED')).toBe(true)
    expect(canManageSession('COMPLETED')).toBe(false)
    expect(canManageSession('CANCELLED')).toBe(false)
  })

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

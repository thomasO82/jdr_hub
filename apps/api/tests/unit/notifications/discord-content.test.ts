import { describe, expect, it } from 'vitest'
import { createAbsenceDiscordContent } from '../../../src/modules/notifications/discord-content.js'

describe('Discord absence content', () => {
  it('removes mass mentions, controls and oversized titles', () => {
    const content = createAbsenceDiscordContent({
      gameTitle: `@everyone\n${'A'.repeat(300)}`,
      sessionStartsAt: new Date('2026-09-10T18:00:00.000Z'),
    })
    expect(content).not.toContain('@everyone')
    expect(content).not.toContain('\n')
    expect(content.length).toBeLessThan(300)
  })
})

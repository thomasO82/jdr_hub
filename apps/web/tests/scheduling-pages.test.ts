import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const pagePath = resolve(import.meta.dirname, '../app/parties/[id]/vote/page.tsx')

describe('vote page structure', () => {
  it('uses the shared shell and vote view', () => {
    const source = readFileSync(pagePath, 'utf8')
    expect(source).toContain("features/layout/app-shell")
    expect(source).toContain('ProposalVoteView')
  })
})

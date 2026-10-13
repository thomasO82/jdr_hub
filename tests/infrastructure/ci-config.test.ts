import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '../..')

describe('continuous integration security gates', () => {
  it('defines pull request quality and security checks with pinned actions', () => {
    const workflowPath = resolve(root, '.github/workflows/ci.yml')
    expect(existsSync(workflowPath)).toBe(true)

    const workflow = readFileSync(workflowPath, 'utf8')
    expect(workflow).toContain('pull_request:')
    expect(workflow).toContain('develop')
    expect(workflow).toContain('main')
    expect(workflow).toContain('permissions:')
    expect(workflow).toContain('contents: read')
    expect(workflow).toContain('pnpm install --frozen-lockfile')
    expect(workflow).toContain('pnpm lint')
    expect(workflow).toContain('pnpm typecheck')
    expect(workflow).toContain('pnpm test')
    expect(workflow).toContain('pnpm test:integration')
    expect(workflow).toContain('postgres:17.6-alpine@sha256:')
    expect(workflow).toContain('pnpm build')
    expect(workflow).toContain('pnpm audit --audit-level=high')
    expect(workflow.toLowerCase()).toContain('secret')
    expect(workflow.match(/uses: docker\/scout-action@[0-9a-f]{40}/g)).toHaveLength(2)
    expect(workflow).toContain('image: local://jdr_hub-web-next:latest')
    expect(workflow).toContain('image: local://jdr_hub-api-hono:latest')
    expect(workflow).toContain('only-severities: critical,high')
    expect(workflow).toContain('exit-code: true')
    expect(workflow.match(/write-comment: false/g)).toHaveLength(2)
    expect(workflow).not.toContain('--only-fixed')

    for (const useLine of workflow.match(/^\s*- uses: .*$/gm) ?? []) {
      expect(useLine).toMatch(/@[0-9a-f]{40}/)
    }
  })
})

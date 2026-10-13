import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '../..')

describe('continuous integration security gates', () => {
  it('builds workspace packages before consumer type checks', () => {
    const packageJson = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')) as {
      scripts?: Record<string, string>
    }
    const workspaceBuild = 'pnpm --filter @jdr-hub/shared --filter @jdr-hub/database -r run build'

    expect(packageJson.scripts?.lint).toContain(workspaceBuild)
    expect(packageJson.scripts?.typecheck).toContain(workspaceBuild)
  })

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
    expect(workflow).toContain(':(exclude).github/workflows/ci.yml')
    expect(workflow).toContain(':(exclude)docs/**')
    expect(workflow).toContain(':(exclude)tests/**')
    expect(workflow).toContain(':(exclude)apps/**/tests/**')
    expect(workflow).toContain(':(exclude)packages/**/tests/**')
    expect(workflow).toContain("! git grep -nE 'dangerouslySetInnerHTML|eval\\(|new Function|child_process|shell: *true' -- apps packages ':(exclude)apps/**/tests/**' ':(exclude)packages/**/tests/**'")
    expect(workflow.match(/uses: aquasecurity\/trivy-action@[0-9a-f]{40}/g)).toHaveLength(2)
    expect(workflow).toContain('image-ref: jdr_hub-web-next:latest')
    expect(workflow).toContain('image-ref: jdr_hub-api-hono:latest')
    expect(workflow).toContain('severity: CRITICAL,HIGH')
    expect(workflow).toContain("exit-code: '1'")
    expect(workflow).toContain('version: v0.75.0')
    expect(workflow).not.toContain('docker/scout-action')
    expect(workflow).not.toContain('--only-fixed')

    for (const useLine of workflow.match(/^\s*- uses: .*$/gm) ?? []) {
      expect(useLine).toMatch(/@[0-9a-f]{40}/)
    }
  })

  it('builds runtime images on a patched Node base without bundled npm', () => {
    for (const dockerfilePath of ['apps/web/Dockerfile', 'apps/api/Dockerfile']) {
      const dockerfile = readFileSync(resolve(root, dockerfilePath), 'utf8')

      expect(dockerfile).toContain(
        'node:24.20.0-alpine3.24@sha256:e67514e5d0f6c46656005e1b693b2ec9d52e80b641307de684d4a015ba7a4eaf',
      )
      expect(dockerfile).toContain(
        'RUN apk upgrade --no-cache && rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx',
      )
    }
  })
})

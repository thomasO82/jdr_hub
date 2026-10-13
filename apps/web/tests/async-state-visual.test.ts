import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')

describe('shared async states', () => {
  it('defines accessible loading, error and empty states', () => {
    const state = read('../features/ui/async-state.tsx')

    expect(state).toContain('export function LoadingState')
    expect(state).toContain('role="status"')
    expect(state).toContain('export function ErrorState')
    expect(state).toContain('role="alert"')
    expect(state).toContain('Réessayer')
    expect(state).toContain('export function EmptyState')
    expect(state).toContain('motion-reduce:transition-none')
    expect(state).toContain('focus-visible:')
    expect(state).toContain('min-h-12')
  })

  it('keeps dashboard blocks on the shared state vocabulary', () => {
    const block = read('../features/dashboard/dashboard-block.tsx')

    expect(block).toContain("from '../ui/async-state'")
    expect(block).toContain('<ErrorState')
    expect(block).toContain('<EmptyState')
    expect(block).toContain('<LoadingState')
  })
})

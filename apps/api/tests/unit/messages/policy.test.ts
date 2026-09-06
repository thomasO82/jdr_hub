import { describe, expect, it } from 'vitest'
import { canReadGameMessages, canWriteGameMessages } from '../../../src/modules/messages/policy.js'

describe('game message access policy', () => {
  it('allows owners and active members to read an open game', () => {
    expect(canReadGameMessages({ gameStatus: 'OPEN', isOwner: true, memberStatus: 'NONE' })).toBe(true)
    expect(canReadGameMessages({ gameStatus: 'ACTIVE', isOwner: false, memberStatus: 'ACTIVE' })).toBe(true)
  })

  it('allows owners without a membership row to write an active game', () => {
    expect(canWriteGameMessages({ gameStatus: 'ACTIVE', isOwner: true, memberStatus: 'NONE' })).toBe(true)
    expect(canWriteGameMessages({ gameStatus: 'ACTIVE', isOwner: false, memberStatus: 'ACTIVE' })).toBe(true)
  })

  it('makes closed and completed conversations read-only', () => {
    expect(canReadGameMessages({ gameStatus: 'CLOSED', isOwner: true, memberStatus: 'NONE' })).toBe(true)
    expect(canReadGameMessages({ gameStatus: 'COMPLETED', isOwner: false, memberStatus: 'ACTIVE' })).toBe(true)
    expect(canWriteGameMessages({ gameStatus: 'CLOSED', isOwner: true, memberStatus: 'NONE' })).toBe(false)
    expect(canWriteGameMessages({ gameStatus: 'COMPLETED', isOwner: false, memberStatus: 'ACTIVE' })).toBe(false)
  })

  it('denies drafts, removed members, candidates, and outsiders', () => {
    expect(canReadGameMessages({ gameStatus: 'DRAFT', isOwner: true, memberStatus: 'NONE' })).toBe(false)
    expect(canReadGameMessages({ gameStatus: 'ACTIVE', isOwner: false, memberStatus: 'REMOVED' })).toBe(false)
    expect(canWriteGameMessages({ gameStatus: 'ACTIVE', isOwner: false, memberStatus: 'PENDING' })).toBe(false)
    expect(canWriteGameMessages({ gameStatus: 'ACTIVE', isOwner: false, memberStatus: 'NONE' })).toBe(false)
  })
})

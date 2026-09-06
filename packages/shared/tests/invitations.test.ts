import { describe, expect, it } from 'vitest'
import {
  invitationCommandSchema,
  invitationDecisionSchema,
  invitationStatusSchema,
} from '../src/invitations.js'

const inviteeId = '11111111-1111-4111-8111-111111111111'

describe('invitation shared contracts', () => {
  it('accepts bounded invitation commands and rejects server-controlled fields', () => {
    expect(invitationCommandSchema.parse({ inviteeId })).toEqual({ inviteeId })
    expect(invitationCommandSchema.safeParse({ inviteeId, expiresAt: new Date().toISOString() }).success).toBe(false)
    expect(invitationCommandSchema.safeParse({ inviteeId: 'not-a-uuid' }).success).toBe(false)
  })

  it('accepts only supported invitation statuses and decisions', () => {
    expect(invitationStatusSchema.parse('PENDING')).toBe('PENDING')
    expect(invitationStatusSchema.parse('EXPIRED')).toBe('EXPIRED')
    expect(invitationDecisionSchema.parse({ status: 'ACCEPTED' })).toEqual({ status: 'ACCEPTED' })
    expect(invitationDecisionSchema.parse({ status: 'CANCELLED' })).toEqual({ status: 'CANCELLED' })
    expect(invitationDecisionSchema.safeParse({ status: 'EXPIRED' }).success).toBe(false)
    expect(invitationDecisionSchema.safeParse({ status: 'PENDING' }).success).toBe(false)
  })
})

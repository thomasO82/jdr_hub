import { describe, expect, it } from 'vitest'
import { applicationCommandSchema, applicationDecisionSchema } from '../src/applications.js'

describe('application contracts', () => {
  it('accepts an optional bounded message and rejects unknown fields', () => {
    expect(applicationCommandSchema.parse({})).toEqual({})
    expect(applicationCommandSchema.parse({ message: 'Je souhaite rejoindre votre groupe.' })).toEqual({ message: 'Je souhaite rejoindre votre groupe.' })
    expect(applicationCommandSchema.safeParse({ message: 'x'.repeat(1001) }).success).toBe(false)
    expect(applicationCommandSchema.safeParse({ userId: 'forged' }).success).toBe(false)
  })

  it('accepts only terminal application decisions', () => {
    expect(applicationDecisionSchema.parse({ status: 'ACCEPTED' })).toEqual({ status: 'ACCEPTED' })
    expect(applicationDecisionSchema.parse({ status: 'REJECTED' })).toEqual({ status: 'REJECTED' })
    expect(applicationDecisionSchema.safeParse({ status: 'PENDING' }).success).toBe(false)
  })
})

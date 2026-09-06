import { describe, expect, it } from 'vitest'
import { dashboardBlockStateSchema } from '../src/dashboard.js'

describe('dashboard shared contracts', () => {
  it('accepts explicit rendered block states only', () => {
    expect(dashboardBlockStateSchema.safeParse('READY').success).toBe(true)
    expect(dashboardBlockStateSchema.safeParse('EMPTY').success).toBe(true)
    expect(dashboardBlockStateSchema.safeParse('ERROR').success).toBe(true)
    expect(dashboardBlockStateSchema.safeParse('LOADING').success).toBe(false)
  })
})

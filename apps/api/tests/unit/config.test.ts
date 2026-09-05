import { describe, expect, it } from 'vitest'
import { parsePort } from '../../src/config.js'

describe('API port configuration', () => {
  it('uses the local default when PORT is absent', () => {
    expect(parsePort(undefined)).toBe(8787)
  })

  it.each(['0', '65536', 'not-a-port'])('rejects invalid PORT value %s', (port) => {
    expect(() => parsePort(port)).toThrow(
      'PORT must be an integer between 1 and 65535',
    )
  })
})

import { describe, expect, it } from 'vitest'
import { parseMessageConfig } from '../../../src/modules/messages/config.js'

describe('message infrastructure configuration', () => {
  it('accepts redis and rediss URLs', () => {
    expect(parseMessageConfig({ REDIS_URL: 'redis://redis:6379' })).toEqual({ redisUrl: 'redis://redis:6379' })
    expect(parseMessageConfig({ REDIS_URL: 'rediss://cache.example.test:6380' })).toEqual({ redisUrl: 'rediss://cache.example.test:6380' })
  })

  it('rejects missing and non-Redis URLs', () => {
    expect(() => parseMessageConfig({})).toThrow('REDIS_URL is required')
    expect(() => parseMessageConfig({ REDIS_URL: 'https://cache.example.test' })).toThrow('REDIS_URL must use redis or rediss')
  })
})

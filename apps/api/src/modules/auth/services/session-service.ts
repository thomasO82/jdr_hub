import {
  createHash,
  randomBytes as createRandomBytes,
  randomUUID,
  timingSafeEqual,
} from 'node:crypto'
import { AUTH_LIFETIMES } from '../policy.js'

type RandomBytes = () => Uint8Array

export type StoredSessionCredential = {
  absoluteExpiresAt: Date
  id: string
  idleExpiresAt: Date
  revokedAt: Date | null
  tokenDigest: string
}

export type NewSessionCredential = StoredSessionCredential & {
  token: string
}

export function getSessionTokenDigest(token: string): string {
  return createHash('sha256').update(token).digest('base64url')
}

function matchesTokenDigest(expectedDigest: string, token: string): boolean {
  const expected = Buffer.from(expectedDigest)
  const received = Buffer.from(getSessionTokenDigest(token))
  return expected.length === received.length && timingSafeEqual(expected, received)
}

/** Creates a new opaque browser credential and its server-side-only digest. */
export function createSessionCredential({
  now,
  randomBytes = () => createRandomBytes(32),
}: {
  now: Date
  randomBytes?: RandomBytes
}): NewSessionCredential {
  const token = Buffer.from(randomBytes()).toString('base64url')

  return {
    id: randomUUID(),
    token,
    tokenDigest: getSessionTokenDigest(token),
    idleExpiresAt: new Date(now.getTime() + AUTH_LIFETIMES.sessionIdleMs),
    absoluteExpiresAt: new Date(now.getTime() + AUTH_LIFETIMES.sessionAbsoluteMs),
    revokedAt: null,
  }
}

/** Slides inactivity expiry while never extending the absolute session cap. */
export function getNextIdleExpiry(now: Date, absoluteExpiresAt: Date): Date {
  return new Date(Math.min(now.getTime() + AUTH_LIFETIMES.sessionIdleMs, absoluteExpiresAt.getTime()))
}

/** Confirms that an opaque credential is current, unrevoked and matches its digest. */
export function validateSessionCredential(
  session: StoredSessionCredential,
  token: string,
  now: Date,
): boolean {
  return (
    isSessionActive(session, now) &&
    matchesTokenDigest(session.tokenDigest, token)
  )
}

/** Determines whether a server-side session remains usable independently of its browser credential. */
export function isSessionActive(session: StoredSessionCredential, now: Date): boolean {
  return (
    !session.revokedAt &&
    session.idleExpiresAt.getTime() > now.getTime() &&
    session.absoluteExpiresAt.getTime() > now.getTime()
  )
}

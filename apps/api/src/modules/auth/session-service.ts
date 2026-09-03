import {
  createHash,
  randomBytes as createRandomBytes,
  timingSafeEqual,
} from 'node:crypto'

const SESSION_IDLE_TTL_MS = 7 * 24 * 60 * 60 * 1_000
const SESSION_ABSOLUTE_TTL_MS = 30 * 24 * 60 * 60 * 1_000

type RandomBytes = () => Uint8Array

export type StoredSessionCredential = {
  absoluteExpiresAt: Date
  idleExpiresAt: Date
  revokedAt: Date | null
  tokenDigest: string
}

export type NewSessionCredential = StoredSessionCredential & {
  token: string
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('base64url')
}

function matchesTokenDigest(expectedDigest: string, token: string): boolean {
  const expected = Buffer.from(expectedDigest)
  const received = Buffer.from(hashToken(token))
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
    token,
    tokenDigest: hashToken(token),
    idleExpiresAt: new Date(now.getTime() + SESSION_IDLE_TTL_MS),
    absoluteExpiresAt: new Date(now.getTime() + SESSION_ABSOLUTE_TTL_MS),
    revokedAt: null,
  }
}

/** Slides inactivity expiry while never extending the absolute session cap. */
export function getNextIdleExpiry(now: Date, absoluteExpiresAt: Date): Date {
  return new Date(Math.min(now.getTime() + SESSION_IDLE_TTL_MS, absoluteExpiresAt.getTime()))
}

/** Confirms that an opaque credential is current, unrevoked and matches its digest. */
export function validateSessionCredential(
  session: StoredSessionCredential,
  token: string,
  now: Date,
): boolean {
  return (
    !session.revokedAt &&
    session.idleExpiresAt.getTime() > now.getTime() &&
    session.absoluteExpiresAt.getTime() > now.getTime() &&
    matchesTokenDigest(session.tokenDigest, token)
  )
}

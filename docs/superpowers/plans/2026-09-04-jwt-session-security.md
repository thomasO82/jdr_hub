# JWT Session Security Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the legacy opaque browser session with a short-lived JWT access cookie backed by a revocable, rotating opaque refresh session.

**Architecture:** Discord OAuth remains unchanged. A signed HS256 access JWT carries only the local user ID and session ID; every protected request verifies it and then checks the live server-side session. Refresh credentials remain random opaque values whose SHA-256 digests alone are persisted, and refresh rotates the session atomically.

**Tech Stack:** TypeScript strict, Hono 4.13, `hono/jwt`, Zod 4, Drizzle ORM, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-04-jwt-session-security-design.md`

## Global Constraints

- Keep `JWT_SIGNING_SECRET` server-only, base64url encoded, at least 32 decoded bytes, and never log or commit it.
- Use only the fixed HS256 algorithm and validate issuer, audience, time claims and token purpose.
- Cookies are `HttpOnly`, `SameSite=Lax`, `Secure` in production, and use browser-visible `/api` and `/api/auth` paths.
- OAuth state, PKCE, fixed callback URI and validated internal `returnTo` remain unchanged.
- No schema migration: `sessions.id` is the non-secret JWT `sid`; `token_digest` remains the digest of the opaque refresh credential.
- Test every new behavior red before its production implementation; do not alter tests merged in `main`.

---

### Task 1: Parse and validate JWT key configuration

**Files:**
- Create: `apps/api/src/modules/auth/config-jwt.test.ts`
- Modify: `apps/api/src/modules/auth/config.ts`

**Interfaces:**
- Produces `AuthConfig.jwtSigningSecret: string` and `AuthConfig.previousJwtSigningSecret: string | null`.

- [ ] **Step 1: Write failing configuration tests**

```ts
it('rejects a missing, malformed, short, or duplicated JWT signing key', () => {
  expect(() => parseAuthConfig({ ...validEnvironment, JWT_SIGNING_SECRET: undefined })).toThrow()
  expect(() => parseAuthConfig({ ...validEnvironment, JWT_SIGNING_SECRET: 'not_base64url' })).toThrow()
  expect(() => parseAuthConfig({ ...validEnvironment, JWT_SIGNING_SECRET: 'a'.repeat(42) })).toThrow()
  expect(() => parseAuthConfig({ ...validEnvironment, JWT_PREVIOUS_SIGNING_SECRET: validEnvironment.JWT_SIGNING_SECRET })).toThrow()
})
```

- [ ] **Step 2: Run the targeted test and confirm it fails because JWT variables are unrecognised or unvalidated**

Run: `pnpm --filter @jdr-hub/api test -- config-jwt.test.ts`

- [ ] **Step 3: Implement minimal strict parsing**

Add `JWT_SIGNING_SECRET` and optional `JWT_PREVIOUS_SIGNING_SECRET` to the Zod environment schema. Decode base64url values with `Buffer.from(value, 'base64url')`, require exactly canonical round-tripping and at least 32 bytes, and reject an equal previous key. Return the values only in `AuthConfig`.

- [ ] **Step 4: Run the targeted test and confirm it passes**

Run: `pnpm --filter @jdr-hub/api test -- config-jwt.test.ts`

### Task 2: Issue and validate constrained access JWTs

**Files:**
- Create: `apps/api/src/modules/auth/access-token.ts`
- Create: `apps/api/src/modules/auth/access-token.test.ts`

**Interfaces:**
- Produces `createAccessToken(input): Promise<string>`.
- Produces `verifyAccessToken(input): Promise<{ sessionId: string; userId: string } | null>`.

- [ ] **Step 1: Write failing access-token tests**

```ts
it('accepts only a current HS256 access token with the expected claims', async () => {
  const token = await createAccessToken({ config, sessionId: '11111111-1111-4111-8111-111111111111', userId: '22222222-2222-4222-8222-222222222222', now })
  await expect(verifyAccessToken({ config, token, now })).resolves.toEqual({
    sessionId: '11111111-1111-4111-8111-111111111111', userId: '22222222-2222-4222-8222-222222222222',
  })
})
```

Add independent cases for tampering, expiration, future `iat`, wrong issuer, audience, `token_use`, malformed UUID claims and a token signed with the previous key.

- [ ] **Step 2: Run the targeted test and confirm it fails because the module does not exist**

Run: `pnpm --filter @jdr-hub/api test -- access-token.test.ts`

- [ ] **Step 3: Implement minimal access-token service**

Use `sign` and `verify` from `hono/jwt`, pin `HS256`, include `sub`, `sid`, `iss`, `aud`, `iat`, `nbf`, `exp`, `jti` and `token_use: 'jdr-hub-access'`. Re-validate the decoded claim shape with a strict Zod schema and return `null` for every invalid credential. Verify with the active key then, only if configured, the previous key.

- [ ] **Step 4: Run the targeted test and confirm it passes**

Run: `pnpm --filter @jdr-hub/api test -- access-token.test.ts`

### Task 3: Make refresh sessions addressable, rotatable and user-revocable

**Files:**
- Create: `apps/api/src/modules/auth/session-jwt.test.ts`
- Modify: `apps/api/src/modules/auth/session-service.ts`
- Create: `apps/api/src/modules/auth/repository-jwt.test.ts`
- Modify: `apps/api/src/modules/auth/repository.ts`

**Interfaces:**
- `NewSessionCredential` includes a caller-provided `id`.
- `AuthRepository.findSessionById(id)`, `rotateSession(...)` and `revokeUserSessions(userId, now)` are available.

- [ ] **Step 1: Write failing repository tests**

```ts
it('rotates a valid refresh session once without extending absolute expiry', async () => {
  const replacement = await repository.rotateSession({
    currentTokenDigest: credential.tokenDigest,
    now: new Date('2026-09-04T12:00:00.000Z'),
    replacement: createSessionCredential({ id: replacementId, now: new Date('2026-09-04T12:00:00.000Z') }),
  })
  expect(replacement).toMatchObject({ id: replacementId, absoluteExpiresAt: credential.absoluteExpiresAt })
  expect(await repository.findSession(credential.tokenDigest)).toMatchObject({ revokedAt: expect.any(Date) })
})
```

Add cases that a stale/revoked refresh credential cannot rotate and revoking all sessions prevents lookup as live.

- [ ] **Step 2: Run the targeted tests and confirm they fail because the repository contract lacks rotation and ID lookup**

Run: `pnpm --filter @jdr-hub/api test -- session-jwt.test.ts repository-jwt.test.ts`

- [ ] **Step 3: Implement the minimum data-model-aware repository contract**

Generate an ID with `randomUUID` in `createSessionCredential`. Return stored `id`. Implement Postgres rotation in a transaction: lock/update only a current valid session digest, set its `revokedAt`, insert the replacement preserving the predecessor absolute expiry. Implement matching deterministic in-memory behavior. Add `revokeUserSessions` for account-security workflows.

- [ ] **Step 4: Run targeted tests and confirm they pass**

Run: `pnpm --filter @jdr-hub/api test -- session-jwt.test.ts repository-jwt.test.ts`

### Task 4: Exchange cookies through OAuth, protected routes, refresh and logout

**Files:**
- Create: `apps/api/src/modules/auth/routes-jwt.test.ts`
- Modify: `apps/api/src/modules/auth/routes.ts`

**Interfaces:**
- `GET /me` accepts only `jdr_hub_access` plus a live server session.
- `POST /auth/refresh` requires exact origin and `jdr_hub_refresh`, rotates it, and returns replacement cookies.
- `POST /auth/logout` revokes the refresh session and clears access, refresh and legacy cookies.

- [ ] **Step 1: Write failing route tests**

```ts
it('invalidates a still-current access JWT when logout revokes its session', async () => {
  const { app } = createTestApp()
  const { accessCookie, refreshCookie } = await login(app)
  expect((await app.request('/me', { headers: { cookie: accessCookie } })).status).toBe(200)
  expect((await app.request('/auth/logout', { method: 'POST', headers: { cookie: refreshCookie, origin: config.appOrigin } })).status).toBe(204)
  expect((await app.request('/me', { headers: { cookie: accessCookie } })).status).toBe(401)
})
```

Add cases for login setting both correctly scoped cookies, invalid/tampered/mismatched access JWT returning the generic 401, a missing or hostile origin on refresh returning 403, successful refresh invalidating the old refresh cookie, refresh replay returning 401, and all-session user revocation invalidating issued JWTs.

- [ ] **Step 2: Run the targeted test and confirm it fails because access and refresh cookies do not yet exist**

Run: `pnpm --filter @jdr-hub/api test -- routes-jwt.test.ts`

- [ ] **Step 3: Implement route integration**

At the OAuth callback create the session and access JWT, set `jdr_hub_access` at `/api` and `jdr_hub_refresh` at `/api/auth`, and clear `jdr_hub_session`. Make `/me` verify access JWT then load its `sid` and compare its `sub` to `userId` before touching idle expiry. Add origin-protected refresh that validates the opaque refresh credential, rotates before setting cookies and returns only generic errors. Logout uses the refresh cookie, clears all three cookie names with their respective browser paths, and returns 204.

- [ ] **Step 4: Run the targeted tests and confirm they pass**

Run: `pnpm --filter @jdr-hub/api test -- routes-jwt.test.ts`

### Task 5: Full verification and traceability

**Files:**
- Modify: `docs/features/003-jwt-session-security.md`
- Modify: `docs/project-status.md`

- [ ] **Step 1: Run all prescribed checks**

Run: `pnpm --filter @jdr-hub/api lint && pnpm --filter @jdr-hub/api typecheck && pnpm --filter @jdr-hub/api test && pnpm --filter @jdr-hub/api build`

- [ ] **Step 2: Inspect the diff**

Run: `git diff --check && git diff -- apps/api/src/modules/auth docs/features/003-jwt-session-security.md docs/project-status.md`

- [ ] **Step 3: Record only observed results**

Update F12's test names, Red/Green evidence, security controls, documentation source, limits and manual verification. Do not mark it `IN_REVIEW` until a PR is actually about to be opened.

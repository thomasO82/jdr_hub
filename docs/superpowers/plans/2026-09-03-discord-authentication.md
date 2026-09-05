# Discord OAuth2 and Secure Sessions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow a visitor to authenticate through Discord and receive a revocable, server-side JDR Hub session without ever exposing or persisting a Discord token.

**Architecture:** The Hono `auth` module owns strict OAuth input validation, one-use login attempts, the Discord adapter and API routes. A separate session service generates opaque credentials, stores only their SHA-256 digest, and enforces idle/absolute expiration and revocation. Next.js only renders the responsive connection page and directs the browser to the API; it never imports database code or OAuth secrets.

**Tech Stack:** TypeScript strict, Hono 4.13, Drizzle ORM 0.45 with PostgreSQL, Zod, Vitest 3, Next.js 16 App Router, React 19, Tailwind CSS and Lucide icons.

**Spec:** `docs/superpowers/specs/2026-09-03-discord-auth-design.md`

## Global Constraints

- Use the official Discord OAuth2 authorization-code flow with scope exactly `identify`, strict configured callback URI, PKCE, a random one-use state and no dynamic external redirect.
- Do not persist a Discord access/refresh token or expose an OAuth code, token, client secret, session token or personal data in an URL, API body, error or log.
- Create a local opaque session after successful authentication; persist only a SHA-256 token digest, rotate at login, use `HttpOnly`, `SameSite=Lax`, `Path=/`, and `Secure` only in production.
- `POST /auth/logout` must validate the trusted origin, be idempotent for anonymous visitors, revoke server-side state and expire the cookie.
- API responses retain the `{ data, error, meta: { requestId } }` envelope except redirect and `204` responses; errors must remain generic.
- Create only new tests/migrations; do not modify protected tests, migrations, specifications, branding assets or accepted decisions.
- Use the copied official logo at `apps/web/public/branding/logo.svg`; do not redraw, recolor or crop it.
- Authentication state-changing routes require route-specific rate limiting, safe logging and server-side authorization; test all security cases before production code.
- Use fake credentials and synthetic Discord identities in tests. Never read a real `.env` file.

---

## File Structure

| File | Responsibility |
| --- | --- |
| `packages/shared/src/auth.ts` | Shared strict types and API-safe current-user shape. |
| `packages/database/src/schema/auth.ts` | Drizzle definitions for `users`, `sessions` and `oauth_login_attempts`, constraints and indexes. |
| `packages/database/src/index.ts` | Export schema and a typed database factory without browser exposure. |
| `packages/database/drizzle.config.ts` and `packages/database/migrations/*` | Reversible reviewed migration for the three auth tables. |
| `apps/api/src/modules/auth/config.ts` | Parse, validate and constrain server-only auth configuration. |
| `apps/api/src/modules/auth/oauth.ts` | State, PKCE, callback redirect and Discord authorization URL policy. |
| `apps/api/src/modules/auth/discord-client.ts` | Testable server-only Discord code exchange and minimal identity retrieval. |
| `apps/api/src/modules/auth/session-service.ts` | Opaque-session creation, lookup, expiry, rotation and revocation. |
| `apps/api/src/modules/auth/repository.ts` | Transactional persistence boundary for users, attempts and sessions. |
| `apps/api/src/modules/auth/routes.ts` | `/auth/discord`, callback, logout and `/me` routes. |
| `apps/api/src/modules/auth/middleware.ts` | Reusable authenticated-user loader for later protected modules. |
| `apps/api/src/app.ts` | Compose the module while preserving request IDs, headers and error envelopes. |
| `apps/web/app/connexion/page.tsx` and components | Accessible French responsive sign-in UI using the official copied logo. |
| `docs/security/authorization-matrix.md` | Visitor and signed-in permissions for all routes currently present. |
| `docs/features/002-discord-authentication.md`, `docs/project-status.md` | Accurate TDD evidence, verification results and review status. |

## Task 1: Define database and shared public contracts

**Files:**
- Create: `packages/shared/src/auth.ts`, `packages/database/src/schema/auth.ts`, database schema tests.
- Modify: `packages/shared/src/index.ts`, `packages/database/src/index.ts`, `packages/database/package.json` and lockfile only if schema tooling is needed.

**Consumes:** PostgreSQL factory from `packages/database/src/index.ts`.

**Produces:** `CurrentUser`, `DiscordIdentity`, `SessionRecord`, `OAuthLoginAttempt`, `authSchema`, and a typed API-safe projection with no token fields.

- [ ] **Step 1: Write failing schema and contract tests.**

```ts
expect(users.discordId.notNull).toBeDefined()
expect(uniqueSessionTokenDigest).toBeDefined()
expect(currentUserSchema.safeParse({ id, username, avatarUrl, timezone })).toMatchObject({ success: true })
expect('tokenDigest' in currentUserSchema.parse(value)).toBe(false)
```

- [ ] **Step 2: Run the focused tests and confirm RED.**

Run: `pnpm vitest run packages/database/src/auth.test.ts packages/shared/src/auth.test.ts`

Expected: failing imports because the auth schema/contracts do not yet exist.

- [ ] **Step 3: Implement the smallest strict contracts and schema.**

```ts
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  discordId: varchar('discord_id', { length: 32 }).notNull().unique(),
  username: varchar('username', { length: 64 }).notNull(),
  avatarUrl: varchar('avatar_url', { length: 2_048 }),
  timezone: varchar('timezone', { length: 64 }).notNull().default('Europe/Paris'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
```

Define sessions with an immutable unique `token_digest`, `idle_expires_at`, `absolute_expires_at`, nullable `revoked_at`; define attempts with unique `state_digest`, `code_verifier`, internal destination, expiry and nullable `consumed_at`. Add indexes for active-session lookup, user revocation and attempt expiry.

- [ ] **Step 4: Run focused tests and package typecheck.**

Run: `pnpm vitest run packages/database/src/auth.test.ts packages/shared/src/auth.test.ts && pnpm --filter @jdr-hub/database typecheck && pnpm --filter @jdr-hub/shared typecheck`

Expected: PASS.

- [ ] **Step 5: Generate and inspect a new migration.**

Run the configured Drizzle generation command, inspect the new SQL for only `users`, `sessions`, `oauth_login_attempts`, keys and indexes; do not apply it to a non-test database.

- [ ] **Step 6: Commit.**

```bash
git add packages/shared packages/database pnpm-lock.yaml
git commit -m "feat: add authentication data contracts"
```

## Task 2: Implement pure OAuth and session security policies

**Files:**
- Create: `apps/api/src/modules/auth/config.ts`, `oauth.ts`, `session-service.ts`, and their unit tests.
- Modify: `apps/api/package.json` and lockfile to add justified Zod support.

**Consumes:** shared `DiscordIdentity` and database record types from Task 1.

**Produces:** `parseAuthConfig`, `createLoginAttempt`, `consumeLoginAttempt`, `buildDiscordAuthorizationUrl`, `createSessionCredential`, `validateSessionCredential`, `revokeSession`.

- [ ] **Step 1: Write failing unit tests for hostile and nominal inputs.**

```ts
expect(() => parseAuthConfig({ DISCORD_REDIRECT_URI: 'https://evil.test/callback' })).toThrow()
expect(buildDiscordAuthorizationUrl(attempt, config).searchParams.get('scope')).toBe('identify')
expect(consumeLoginAttempt(attempt, reusedState, now)).toEqual({ ok: false, reason: 'invalid' })
expect(validateSessionCredential(expired, now)).toEqual({ ok: false, reason: 'expired' })
```

Cover missing/malformed config, unallowlisted post-login target, fixed callback URI, random state, PKCE S256 challenge, state mismatch/expiry/replay, SHA-256 rather than raw persistence, idle/absolute expiration, rotation and revocation.

- [ ] **Step 2: Run the focused tests and confirm RED.**

Run: `pnpm vitest run apps/api/src/modules/auth/oauth.test.ts apps/api/src/modules/auth/session-service.test.ts apps/api/src/modules/auth/config.test.ts`

Expected: failing module imports.

- [ ] **Step 3: Implement only pure, injected-clock/injected-randomness policy code.**

```ts
export function hashSecret(secret: string): string {
  return createHash('sha256').update(secret).digest('base64url')
}

export function isInternalReturnPath(value: string): boolean {
  return value.startsWith('/') && !value.startsWith('//') && !value.includes('\\')
}
```

Use `timingSafeEqual` only for equal-length state digest comparisons. Produce generic failure reasons for routes; keep detailed reasons internal and non-logged.

- [ ] **Step 4: Run focused tests and lint/typecheck.**

Run: `pnpm vitest run apps/api/src/modules/auth/{oauth,session-service,config}.test.ts && pnpm --filter @jdr-hub/api lint`

Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add apps/api/package.json apps/api/src/modules/auth pnpm-lock.yaml
git commit -m "feat: add OAuth and session security policies"
```

## Task 3: Add transactional persistence and Discord adapter

**Files:**
- Create: `apps/api/src/modules/auth/repository.ts`, `discord-client.ts`, their integration-style tests using an in-memory fake repository and mocked `fetch`.

**Consumes:** Task 1 schema/types and Task 2 policy functions.

**Produces:** `AuthRepository`, `upsertDiscordUser`, `createAndConsumeLogin`, `exchangeDiscordCode`, `getDiscordIdentity`.

- [ ] **Step 1: Write failing tests before the adapter/repository.**

```ts
await expect(exchangeDiscordCode({ code: 'fake-code' }, fetchFailure)).rejects.toThrow('DISCORD_OAUTH_FAILED')
await expect(createAndConsumeLogin(input, repository)).resolves.toMatchObject({ user: { discordId: '123' } })
expect(repository.persistedRawDiscordToken).toBeUndefined()
```

Test one transaction consumes a matching unexpired attempt exactly once, updates the same user for the same Discord ID, creates one hashed session, rolls back on external failure and does not send code/token to logs or return values.

- [ ] **Step 2: Run tests and confirm RED.**

Run: `pnpm vitest run apps/api/src/modules/auth/{repository,discord-client}.test.ts`

Expected: failing imports.

- [ ] **Step 3: Implement the database boundary and Discord HTTP adapter.**

```ts
export interface AuthRepository {
  consumeLoginAttempt(stateDigest: string, now: Date): Promise<OAuthLoginAttempt | null>
  upsertDiscordUser(identity: DiscordIdentity, now: Date): Promise<CurrentUser>
  createSession(input: NewSession): Promise<void>
  revokeSessionByDigest(tokenDigest: string, now: Date): Promise<void>
}
```

Call Discord’s token endpoint server-to-server with form encoding and then `/users/@me`; accept only a complete minimal identity. Do not return, persist or log the token response.

- [ ] **Step 4: Run focused tests.**

Run: `pnpm vitest run apps/api/src/modules/auth/{repository,discord-client}.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add apps/api/src/modules/auth
git commit -m "feat: persist Discord identities and sessions"
```

## Task 4: Expose hardened Hono authentication routes and middleware

**Files:**
- Create: `apps/api/src/modules/auth/routes.ts`, `middleware.ts`, route tests.
- Modify: `apps/api/src/app.ts`, `apps/api/src/index.ts`, API configuration tests.

**Consumes:** `AuthRepository`, Discord adapter, policies and existing request-ID/error-envelope middleware.

**Produces:** `registerAuthRoutes(app, dependencies)` and `requireAuthenticatedUser` for later modules.

- [ ] **Step 1: Write API tests first.**

```ts
expect((await app.request('/auth/discord?returnTo=https://evil.test')).status).toBe(400)
expect((await app.request('/auth/discord/callback?code=x&state=used')).status).toBe(400)
expect((await app.request('/me')).status).toBe(401)
expect((await app.request('/auth/logout', { method: 'POST', headers: { origin: 'https://evil.test' } })).status).toBe(403)
```

Also assert start/callback rate limits, `302` authorization redirect, callback cookie flags, no session fixation, callback replay rejection, Discord error sanitisation, `GET /me` safe profile only, logout `204` plus expired cookie, revoked/expired session `401`, idempotent anonymous logout, and no state/code/cookie appears in `Location` or error body.

- [ ] **Step 2: Run API tests and confirm RED.**

Run: `pnpm vitest run apps/api/src/modules/auth/routes.test.ts`

Expected: failures because routes are unregistered.

- [ ] **Step 3: Implement composition with injected dependencies.**

```ts
app.get('/auth/discord', startDiscordLogin)
app.get('/auth/discord/callback', completeDiscordLogin)
app.post('/auth/logout', logout)
app.get('/me', currentUser)
```

Use a small per-route limiter keyed by client address only as a best-effort abuse control; choose finite injectable test limits. Validate callback query parameters with strict Zod schemas. Check `Origin` against the configured public origin before logout. Preserve global security headers and only log event type plus request ID.

- [ ] **Step 4: Run route tests and existing API suite.**

Run: `pnpm vitest run apps/api/src/modules/auth/routes.test.ts apps/api/src/app.test.ts apps/api/src/config.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add apps/api/src
git commit -m "feat: add secure authentication API routes"
```

## Task 5: Add the responsive connection page and authorization documentation

**Files:**
- Create: `apps/web/app/connexion/page.tsx`, `apps/web/app/connexion/connection-card.tsx`, UI tests, `docs/security/authorization-matrix.md`.
- Modify: `apps/web/app/layout.tsx` only if shared metadata/fonts are needed without weakening existing headers.

**Consumes:** official public logo and API route `GET /auth/discord`.

**Produces:** accessible `/connexion` desktop/mobile sign-in page.

- [ ] **Step 1: Write failing UI and document assertions first.**

```ts
expect(render(ConnectionPage).getByRole('link', { name: /se connecter avec discord/i })).toHaveAttribute('href', '/api/auth/discord')
expect(render(ConnectionPage).getByAltText('JDR Hub')).toHaveAttribute('src', '/branding/logo.svg')
expect(authorizationMatrix).toContain('| Visiteur | Démarrer OAuth, callback |')
```

Test French copy, keyboard focus, link accessible name, no unsupported guest or VTT promise, official-logo path, responsive container classes and safe error presentation.

- [ ] **Step 2: Run tests and confirm RED.**

Run: `pnpm vitest run tests/components/connection-page.test.tsx`

Expected: failing route import.

- [ ] **Step 3: Implement the smallest page faithful to the reconciled design.**

```tsx
<main className="min-h-screen bg-slate-950 px-4 py-10 text-white">
  <section className="mx-auto flex w-full max-w-md flex-col items-center rounded-2xl p-6 sm:p-10">
    <Image src="/branding/logo.svg" alt="JDR Hub" width={108} height={96} priority />
    <a className="..." href="/api/auth/discord">Se connecter avec Discord</a>
  </section>
</main>
```

Use the official logo unchanged. Preserve a sober dark-violet full-screen desktop treatment and the mobile card hierarchy, but omit the guest CTA because it is not specified for MVP. Keep the component server-rendered unless browser-only state becomes necessary.

- [ ] **Step 4: Run UI tests, web typecheck and build.**

Run: `pnpm vitest run tests/components/connection-page.test.tsx && pnpm --filter @jdr-hub/web typecheck && pnpm --filter @jdr-hub/web build`

Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add apps/web docs/security/authorization-matrix.md tests/components
git commit -m "feat: add Discord connection page"
```

## Task 6: Verify, document and prepare review

**Files:**
- Modify: `docs/features/002-discord-authentication.md`, `docs/project-status.md`, `README.md` if setup instructions are missing.

**Consumes:** all earlier tasks and their actual command output.

**Produces:** an honest F01 `IN_REVIEW` record and PR-ready verification evidence.

- [ ] **Step 1: Add a failing regression only if a documented F01 acceptance criterion remains uncovered.**

Run the focused test first to confirm it is red, then add minimal code and re-run it. Do not alter an existing protected test.

- [ ] **Step 2: Execute final verification from a clean checkout state.**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm audit --audit-level=high && git diff --check && git status --short`

Expected: every command succeeds; record the precise result and any unavailable external E2E limitation.

- [ ] **Step 3: Perform security/documentation review.**

Check the OAuth/session/CSRF checklist, authorization matrix, no secret-bearing files, no raw credential logging, migration scope, responsive keyboard navigation and desktop/mobile rendering. Update the F01 feature record with actual Red/Green/Refactor evidence, tests, limits and all commands actually run. Change its status and the project table to `IN_REVIEW` only after a PR exists.

- [ ] **Step 4: Commit documentation and request review.**

```bash
git add docs README.md
git commit -m "docs: record Discord authentication verification"
```

Create a PR to `develop` only after fresh verification; do not merge it. Include security controls, tests, TDD proof, migration review and manual checks.

## Plan Self-Review

- Spec coverage: Tasks 1–4 cover Discord OAuth, state/PKCE, callback, safe identity upsert, opaque sessions, expiration, revocation, logout, `/me`, origin validation, rate limiting and API error contracts. Task 5 covers D03/M03 and official branding. Task 6 covers authorization documentation, verification and traceability.
- Placeholder scan: no `TBD`, `TODO`, deferred implementation placeholders or cross-task references lacking a defined interface remain.
- Type consistency: `AuthRepository` is the sole persistence interface; `DiscordIdentity` and `CurrentUser` originate from the shared contract and are consumed consistently by the route and session layers.

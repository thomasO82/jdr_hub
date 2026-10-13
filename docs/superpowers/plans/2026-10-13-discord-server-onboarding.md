# Discord Server Onboarding and Absence Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users optionally authorize joining the private JDR Hub Discord server while preserving in-app absence notifications and supplemental Discord DMs to opted-in game masters.

**Architecture:** Keep the existing `identify` login unchanged. After login, a session-bound OAuth2 flow requests only `guilds.join`, adds the signed-in Discord identity to the configured guild using the bot credential, and stores only a joined timestamp. Absence persistence always creates the in-app notification; the existing transactional outbox schedules a Discord DM only when the recipient has joined.

**Tech Stack:** pnpm monorepo, TypeScript strict, Hono, Zod, Drizzle ORM, PostgreSQL, native `fetch`, Discord OAuth2/API, Next.js App Router, Tailwind CSS v4, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-13-game-messaging-and-discord-notifications-design.md`

## Global Constraints

- Work on the existing `feat/game-messaging` branch; do not create a worktree, force-push, or rewrite its published history.
- Reconcile the branch with the latest `origin/develop` using a history-preserving merge before opening a PR; resolve conflicts without discarding either side.
- Initial login requests only `identify`; the separate opt-in flow requests only `guilds.join` and is never required for using JDR Hub.
- Discord access/refresh tokens are short-lived inputs to the guild-join operation and are never persisted, logged, or returned to the browser.
- `DISCORD_BOT_TOKEN` and `DISCORD_GUILD_ID` are runtime environment values; never add real values to source, tests, Docker images, logs, or documentation.
- The Discord bot must already be in the configured guild and have the minimum `CREATE_INSTANT_INVITE` permission required by Discord’s Add Guild Member endpoint.
- The in-app absence notification is always committed; Discord outbox creation is conditional and Discord failure never rolls back or hides the in-app notification.
- Do not add or update dependencies without explicit owner approval; use the existing native `fetch` and project dependencies.
- Write each new behavior test first, observe its expected failure, implement the minimum, and keep merged tests immutable.
- UI errors are clear French messages; backend/provider error details and notification contents are excluded from logs.

## Review Focus

- OAuth denial or callback cancellation must preserve the valid JDR Hub account/session — pin in Task 2’s API tests.
- Expired, mismatched, or replayed membership `state` must never add a user — pin in Task 1’s service/API tests.
- A user already in the guild must be handled idempotently, and an unexpected Discord response must not mark them connected — pin in Task 1’s client tests.
- A non-owner session must not start or complete membership authorization for another account — pin in Task 2’s authorization tests.
- Discord DM blocked/unavailable after an absence must not remove the internal notification — pin in Task 3’s integration and worker tests.

---

## File Map

### API auth and Discord membership

- Modify `apps/api/src/modules/auth/config.ts` to parse `DISCORD_GUILD_ID` with the other server-only OAuth settings.
- Modify `apps/api/src/modules/auth/repository.ts` and `apps/api/tests/helpers/in-memory-auth-repository.ts` for one-use guild-join attempts and membership state.
- Modify `apps/api/src/modules/auth/services/oauth.ts` only for shared safe primitives; create `apps/api/src/modules/auth/services/discord-guild-membership.ts` for the single join use case.
- Create `apps/api/src/modules/auth/discord-guild-client.ts` to exchange the authorization code and call Discord’s Add Guild Member endpoint.
- Modify `apps/api/src/modules/auth/handlers.ts` and `routes.ts` to expose membership start, callback dispatch through the existing fixed Discord callback, status, and dismiss operations; keep HTTP parsing/cookies in handlers.
- Modify `packages/database/src/schema/auth.ts`, `packages/database/src/index.ts`, and add the additive migration `packages/database/migrations/0010_game-messages-and-discord-consent.sql` plus generated snapshot/journal entries.

### Web consent and account settings

- Modify `apps/web/features/authentication/connection-view.tsx` to explain the optional post-login server consent and keep the initial OAuth redirect.
- Create `apps/web/app/profil/page.tsx`, `apps/web/features/profile/profile-view.tsx`, and `apps/web/features/profile/discord-server-card.tsx` for join status, consent, retry, and “Pas maintenant”.
- Create `apps/web/lib/discord-server-api.ts` for authenticated status/dismiss requests and the safe OAuth start URL.
- Keep all styling Tailwind-only and use the current app shell/design tokens.

### Absence notification delivery

- Restore Discord delivery modules from the F07 baseline, adapting rather than blindly copying: `apps/api/src/modules/notifications/config.ts`, `discord-client.ts`, `discord-content.ts`, and `worker.ts`.
- Modify `apps/api/src/modules/attendance/repository.ts` and `apps/api/tests/helpers/in-memory-attendance-repository.ts` to enqueue an idempotent Discord outbox delivery only for an opted-in owner.
- Modify `apps/api/src/index.ts`, `docker-compose.yml`, `.env.example`, and notification tests to configure/start the worker without exposing secrets.
- Update `docs/features/013-attendance-notifications.md`, `docs/security/authorization-matrix.md`, and `docs/project-status.md` to describe actual behavior.

## Task 1: Model consent and implement the Discord guild-join client

**Files:**
- Modify: `apps/api/src/modules/auth/config.ts`
- Modify: `apps/api/src/modules/auth/repository.ts`
- Create: `apps/api/src/modules/auth/discord-guild-client.ts`
- Create: `apps/api/src/modules/auth/services/discord-guild-membership.ts`
- Modify: `packages/database/src/schema/auth.ts`
- Modify: `packages/database/src/index.ts`
- Create: `packages/database/migrations/0010_game-messages-and-discord-consent.sql`
- Create: `packages/database/migrations/meta/0010_snapshot.json`
- Modify: `packages/database/migrations/meta/_journal.json`
- Test: `apps/api/tests/unit/auth/discord-guild-client.test.ts`
- Test: `apps/api/tests/unit/auth/discord-guild-membership.test.ts`
- Test: `apps/api/tests/unit/auth/config.test.ts`
- Test: `packages/database/tests/auth-schema.test.ts`

**Interfaces:**
- `DiscordGuildMembershipClient.addCurrentUser(input: { code: string; codeVerifier: string; discordUserId: string; config: AuthConfig }): Promise<void>` exchanges the code, calls Discord with the OAuth user access token and bot token, accepts `201` and already-member `204`, and returns no token or Discord payload.
- `AuthRepository.createGuildJoinAttempt(input: { userId: string; sessionId: string; attempt: OAuthLoginAttempt }): Promise<void>` stores only the state digest, PKCE verifier, user ID, session ID, expiry, and consumed time.
- `AuthRepository.consumeGuildJoinAttempt(stateDigest: string, now: Date, binding: { userId: string; sessionId: string }): Promise<{ userId: string; sessionId: string; attempt: OAuthLoginAttempt } | null>` atomically consumes a valid one-use attempt only for the initiating user and session.
- `AuthRepository.markDiscordGuildJoined(userId: string, now: Date): Promise<void>` sets `users.discord_server_joined_at`; `getDiscordGuildMembership(userId: string): Promise<{ joinedAt: Date | null; promptDismissedAt: Date | null }>` returns only local state.
- `completeDiscordGuildJoin(input: { code: string; state: string; sessionId: string; sessionUserId: string; config: AuthConfig; repository: AuthRepository; client: DiscordGuildMembershipClient; now: () => Date }): Promise<string | null>` requires both authenticated session identifiers to match; it never accepts client-supplied identity.

- [x] **Step 1: Write failing client and repository tests.** Assert token exchange uses the fixed Discord endpoint, the `guilds.join` scope, the configured guild ID and minimal Bot authorization; accept `201`/`204`; reject malformed responses and provider failures without exposing tokens. Assert expired/replayed state cannot be consumed and membership state stores timestamps only.
- [x] **Step 2: Run the focused tests and confirm Red.** Run `pnpm exec vitest run apps/api/tests/unit/auth/discord-guild-client.test.ts apps/api/tests/unit/auth/discord-guild-membership.test.ts packages/database/tests/auth-schema.test.ts`. Expected: FAIL because the client/use case/schema/migration do not exist.
- [x] **Step 3: Implement config, persistence, and the Discord client.** Add the nullable membership/dismissal timestamps and one-use `discord_guild_join_attempts` table; generate the additive migration from Drizzle. The Discord client handles `201 Created` and `204 No Content` as success, checks `response.ok` otherwise, and never includes raw response bodies in errors.
- [x] **Step 4: Run the focused tests and confirm Green.** Re-run the command from Step 2. Expected: all new OAuth client, repository, config, and additive migration assertions pass.
- [x] **Step 5: Commit the independently testable membership foundation.** Commit `9d956f7` (`feat: model optional Discord server membership`).

## Task 2: Add authenticated consent routes and French onboarding

**Files:**
- Modify: `apps/api/src/modules/auth/handlers.ts`
- Modify: `apps/api/src/modules/auth/routes.ts`
- Modify: `apps/api/src/modules/auth/repository.ts`
- Modify: `apps/api/tests/api/auth/routes.test.ts`
- Modify: `apps/api/tests/helpers/in-memory-auth-repository.ts`
- Modify: `apps/web/features/authentication/connection-view.tsx`
- Create: `apps/web/app/profil/page.tsx`
- Create: `apps/web/features/profile/profile-view.tsx`
- Create: `apps/web/features/profile/discord-server-card.tsx`
- Create: `apps/web/lib/discord-server-api.ts`
- Test: `apps/web/tests/discord-server-api.test.ts`
- Test: `apps/web/tests/discord-server-card.test.ts`

**Interfaces:**
- `GET /auth/discord/server` requires an authenticated session, creates a purpose-bound OAuth attempt, and redirects to Discord with only `guilds.join`.
- The existing `GET /auth/discord/callback` dispatches membership callbacks by one-use stored state; it accepts either a valid `{ code, state }` or user denial `{ error: "access_denied", state }`, without changing the JDR Hub session.
- `POST /auth/discord/server/dismiss` requires the trusted Origin and active session, records `promptDismissedAt`, and returns `204`.
- `GET /me` adds `discordServerJoined: boolean` and `discordServerPromptDismissed: boolean`; it exposes no Discord token or guild ID.
- The profile card offers “Autoriser le bot à rejoindre le serveur”, “Pas maintenant”, and a connected status; its explanation says the server is for bot notifications, refusal does not block the app, and DMs may still be blocked by Discord privacy settings.

- [x] **Step 1: Add failing API tests for the consent routes.** Cover authenticated start, unauthenticated denial, exact `guilds.join` scope, valid join success, explicit denial, wrong session/state, callback replay, trusted-Origin dismissal, and safe `/me` projection. Assert no denied/failed consent revokes or prevents the session.
- [x] **Step 2: Run the auth route tests and confirm Red.** Run `pnpm exec vitest run apps/api/tests/api/auth/routes.test.ts`. Expected: FAIL because the server-consent routes and membership fields are absent.
- [ ] **Step 3: Implement handlers/routes and frontend consent/status.** Keep transport validation in Hono handlers and OAuth coordination in the single-purpose service. Return only fixed internal redirects. Once `/profil` exists, redirect the Discord login CTA there so newly registered users immediately see the optional choice; until then preserve the current `/` landing route to avoid redirecting users to a missing page.
- [ ] **Step 4: Add failing frontend tests, then run them Red.** Assert French explanation/refusal copy, connected/not-connected states, API credentials, translated errors, and no token/guild-ID in rendered source. Run `pnpm exec vitest run apps/web/tests/discord-server-api.test.ts apps/web/tests/discord-server-card.test.ts`; expected: FAIL because the card/API do not exist.
- [ ] **Step 5: Implement the profile page/card and API client.** Use the shared app shell, Tailwind tokens, keyboard focus, and mobile layouts; “Pas maintenant” leaves the account usable.
- [ ] **Step 6: Run focused API and web tests and confirm Green.** Run both test commands from Steps 1 and 4. Expected: all consent, denial, access-control, and UI assertions pass.
- [ ] **Step 7: Commit the consent flow.** `git add` only the auth routes/services/tests and profile/onboarding files, then `git commit -m "feat: let users opt into Discord server notifications"`.

## Task 3: Restore transactional Discord absence delivery

**Files:**
- Create: `apps/api/src/modules/notifications/config.ts`
- Create: `apps/api/src/modules/notifications/discord-client.ts`
- Create: `apps/api/src/modules/notifications/discord-content.ts`
- Create: `apps/api/src/modules/notifications/worker.ts`
- Modify: `apps/api/src/modules/attendance/repository.ts`
- Modify: `apps/api/src/index.ts`
- Modify: `apps/api/tests/helpers/in-memory-attendance-repository.ts`
- Modify: `apps/api/tests/integration/postgres-attendance-notifications.test.ts`
- Create: `apps/api/tests/unit/notifications/discord-client.test.ts`
- Create: `apps/api/tests/unit/notifications/worker.test.ts`
- Modify: `apps/api/tests/unit/attendance/services.test.ts`
- Modify: `docker-compose.yml`
- Modify: `.env.example`

**Interfaces:**
- Preserve the existing `NotificationRepository` outbox contract in the F07 baseline: claim due deliveries with a lease, mark sent, retryable failure, or permanent failure.
- `NotificationConfig` parses `DISCORD_BOT_TOKEN` and existing retry/worker values once at startup; `DISCORD_GUILD_ID` is parsed only by `AuthConfig` and passed to the membership client. The bot token is never exposed to a route or frontend.
- `createDiscordNotifier(config).sendDirectMessage({ recipientDiscordId, content, idempotencyKey }): Promise<{ providerMessageId: string }>` validates the recipient/content, disables mentions, and maps provider failures to safe internal codes.
- `AttendanceRepository.reportAbsence(...)` keeps returning `{ attendance, notification }`; within the same PostgreSQL transaction it inserts the unique Discord delivery only when the owner has `discordServerJoinedAt !== null`.

- [ ] **Step 1: Write failing outbox/worker/integration tests.** The conditional outbox and post-consent replay scenarios have explicit failing PostgreSQL tests; dedicated worker/client unit tests were added after their implementation, so TDD evidence for those modules is incomplete and recorded in the progress ledger.
- [x] **Step 2: Run focused tests and confirm Red.** The PostgreSQL integration test failed before the conditional outbox implementation: opted-in owner returned no delivery.
- [x] **Step 3: Restore and adapt F07 delivery modules.** Restored bounded content, mention suppression, idempotency, retry cap/backoff, and lease recovery; added opt-in gating. Worker/client unit tests were added after these modules; this is a TDD evidence gap recorded in the progress ledger.
- [x] **Step 4: Wire startup and local configuration.** Configuration is parsed once, worker lifecycle is tied to API startup/shutdown, secrets are runtime-only in Compose, and PostgreSQL/Redis remain internal.
- [x] **Step 5: Run tests and confirm Green.** Final verification passed: `pnpm test` — 106 files/291 tests; `pnpm test:integration` — 8 files/17 tests; `pnpm run lint`, `pnpm run typecheck`, `pnpm build`, and Compose config. The first web build was blocked by sandbox port binding, then passed with local network permission.
- [ ] **Step 6: Commit the Discord notification restoration.** `git add` only attendance/outbox/worker/config/Compose/env/tests, then `git commit -m "feat: preserve Discord absence notifications"`.

## Task 4: Reconcile documentation and verify the Discord subsystem

**Files:**
- Modify: `docs/features/013-attendance-notifications.md`
- Modify: `docs/security/authorization-matrix.md`
- Modify: `docs/project-status.md`
- Modify: `.env.example`
- Verify: `apps/api`, `packages/database`, and `apps/web` focused suites

- [x] **Step 1: Update documentation from implemented behavior.** Record internal notification fallback, optional server consent, no retroactive DMs for pre-consent absences, DM delivery limits, required Discord configuration/permission, and tests actually run. Mark the feature `IN_PROGRESS` until a PR is opened.
- [ ] **Step 2: Run verification.** Run `pnpm exec vitest run apps/api/tests/unit/auth apps/api/tests/api/auth apps/api/tests/unit/notifications apps/api/tests/unit/attendance apps/api/tests/integration/postgres-attendance-notifications.test.ts apps/web/tests/discord-server-api.test.ts apps/web/tests/discord-server-card.test.ts packages/database/tests/auth-schema.test.ts`, then `pnpm lint`, `pnpm typecheck`, and `pnpm build`.
- [x] **Step 3: Review integration state.** `git diff --check`, status/diff review, secret-free fixtures, and Compose config with test-only values passed. Web UI review remains pending.
- [ ] **Step 4: Commit documentation and verification evidence.** Commit only after the required checks pass; do not push/open a PR until the companion game-messaging plan is also complete and the whole branch is verified.

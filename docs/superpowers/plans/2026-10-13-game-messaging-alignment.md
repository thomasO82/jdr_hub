# Game Messaging Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete and verify the existing per-game text conversation while keeping all chat content inside JDR Hub and preserving PostgreSQL, REST, SSE, and Redis Streams boundaries.

**Architecture:** Reconcile the existing `feat/game-messaging` implementation with the approved design and latest `develop`; test missing delivery/revocation edges, close any verified gaps, and keep the message history authoritative in PostgreSQL. Discord work is owned by the separate Discord onboarding/notifications plan and must not be mixed into message payloads or transport.

**Tech Stack:** pnpm monorepo, TypeScript strict, Next.js App Router, Hono, Zod, Drizzle ORM, PostgreSQL, Redis Streams, Server-Sent Events, Tailwind CSS v4, Vitest, Docker Compose.

**Spec:** `docs/superpowers/specs/2026-10-13-game-messaging-and-discord-notifications-design.md`

## Global Constraints

- Work only on `feat/game-messaging`; do not create a worktree, force-push, or rewrite its published history.
- Merge latest `origin/develop` into the existing branch with a history-preserving merge before PR preparation; preserve both approved F07 Discord notification behavior and the message feature.
- The existing message feature code and `redis` dependency are already on this unmerged branch; do not update/install dependencies or rewrite `pnpm-lock.yaml` without explicit owner approval.
- PostgreSQL remains the durable source of truth; Redis Streams are bounded internal event transport only, with no public port and no message history authority.
- The message body is trimmed text, 1–2,000 characters; identity comes from the authenticated session; only the game owner and active members can read/write under the game lifecycle rules.
- Message content is rendered as text, never HTML/Markdown, and is not written to logs, Discord, or DMs.
- Preserve Tailwind-only styling, responsive/accessibility requirements, French actionable UI errors, Zod strictness, exact-origin write protection, rate limits, and security headers.
- Add no implementation before a test demonstrates the missing behavior; do not modify merged tests except under the documented `AGENTS.md` exception process.

## Review Focus

- A message created between the initial history response and the first SSE subscription must not disappear from the active chat — pin in Task 1’s API/browser integration test.
- Membership removal while an SSE stream is idle must stop future message disclosure — pin in Task 2’s stream authorization test.
- Redis outage after PostgreSQL commit must leave the message durable and UI recovery actionable — pin in Task 1’s API/UI test.
- Cursor corruption or boundary timestamps must not skip/reorder messages — pin in Task 1’s pagination integration test.
- Closing/completing a game must preserve authorized read history but reject writes — retain and extend the existing Task 2 policy/API test.

---

## File Map

### Existing shared contract and persistence

- Review/adjust `packages/shared/src/game-messages.ts`, `packages/database/src/schema/game-messages.ts`, `packages/database/src/index.ts`, and the additive `0010_game-messages-and-discord-consent` migration only if the tests identify a concrete mismatch.
- Extend `packages/shared/tests/game-messages.test.ts`, `packages/database/tests/game-messages-schema.test.ts`, and `apps/api/tests/integration/postgres-game-messaging.test.ts` for the exact contract and pagination gaps below.

### API and realtime

- Modify `apps/api/src/modules/messages/handlers.ts`, `repository.ts`, and `redis-event-bus.ts` only to close tested security, ordering, or bootstrap gaps.
- Extend `apps/api/tests/api/messages/routes.test.ts`, `apps/api/tests/unit/messages/event-bus.test.ts`, and `apps/api/tests/integration/redis-game-messaging.test.ts`.

### Web and docs

- Modify `apps/web/lib/game-messages-api.ts`, `apps/web/features/messages/game-chat-view.tsx`, and `apps/web/features/games/game-detail-view.tsx` only for tested bootstrap/recovery behavior or design-system gaps.
- Extend `apps/web/tests/game-messages-api.test.ts` and `apps/web/tests/game-chat-visual.test.ts`.
- Update `docs/features/015-game-messaging.md`, `docs/implementation-plan.md`, `docs/project-status.md`, and `docs/security/authorization-matrix.md` after implementation evidence is available.

## Task 1: Make history bootstrap, Redis recovery, and pagination gap-safe

**Files:**
- Modify: `apps/api/src/modules/messages/event-bus.ts`
- Modify: `apps/api/src/modules/messages/redis-event-bus.ts`
- Modify: `apps/api/src/modules/messages/handlers.ts`
- Modify: `apps/web/lib/game-messages-api.ts`
- Modify: `apps/web/features/messages/game-chat-view.tsx`
- Test: `apps/api/tests/api/messages/routes.test.ts`
- Test: `apps/api/tests/unit/messages/event-bus.test.ts`
- Test: `apps/api/tests/integration/redis-game-messaging.test.ts`
- Test: `apps/api/tests/integration/postgres-game-messaging.test.ts`
- Test: `apps/web/tests/game-messages-api.test.ts`

**Interfaces:**
- Extend `GameMessageEventBus.subscribe(input)` with `onReady: () => Promise<void>`; resolve it only after the Redis reader is connected and ready to consume.
- Emit an SSE `ready` event after authorization and successful subscription setup. The browser client exposes `onReady` through its injectable EventSource adapter without placing message content or authorization data in the URL.
- `GameChatView` starts the stream, waits for `ready`, loads the PostgreSQL history, and merges live/history records by message UUID without duplicates.
- Keep `GameMessagesPage` and the current REST route contracts unchanged unless a failing pagination test proves a contract defect.

- [ ] **Step 1: Write a failing test for the REST/SSE startup race.** In `apps/api/tests/api/messages/routes.test.ts` and `apps/web/tests/game-messages-api.test.ts`, simulate a message created after the history query begins but before the first live read; assert it appears exactly once without manual page reload.
- [ ] **Step 2: Run focused tests and confirm Red.** Run `pnpm exec vitest run apps/api/tests/api/messages/routes.test.ts apps/api/tests/unit/messages/event-bus.test.ts apps/web/tests/game-messages-api.test.ts`. Expected: the injected interleaving demonstrates a missing message or absent ready signal.
- [ ] **Step 3: Implement subscribe-before-history bootstrap.** Add a readiness handshake and ensure the client buffers live events until initial REST history resolves, then deduplicates by UUID and preserves newest-first display order.
- [ ] **Step 4: Test Redis failure after commit.** Add an API/UI assertion that a persisted message remains successful when publish fails and the UI shows a French recoverable live-update error; do not claim the Redis event was delivered.
- [ ] **Step 5: Test pagination boundaries.** Add PostgreSQL integration records with equal `createdAt` timestamps and malformed cursors; assert stable `(createdAt, id)` ordering, no skips across pages, and a safe `400` for invalid cursors.
- [ ] **Step 6: Run focused tests and confirm Green.** Re-run the commands from Steps 2, 4, and 5. Expected: no bootstrap gap, no duplicate messages, and stable pagination/recovery behavior.
- [ ] **Step 7: Commit the independently testable transport improvement.** `git add` only message bus/API/web and their tests, then `git commit -m "fix: close game message stream bootstrap gaps"`.

## Task 2: Prove resource authorization and revocation across REST and SSE

**Files:**
- Modify if required: `apps/api/src/modules/messages/policy.ts`
- Modify if required: `apps/api/src/modules/messages/repository.ts`
- Modify if required: `apps/api/src/modules/messages/handlers.ts`
- Test: `apps/api/tests/unit/messages/policy.test.ts`
- Test: `apps/api/tests/api/messages/routes.test.ts`
- Test: `apps/api/tests/integration/postgres-game-messaging.test.ts`

**Interfaces:**
- Keep `getAccess({ gameIdOrSlug, userId })` as the sole source of `canRead`/`canWrite`; the session supplies `userId`, never request JSON.
- REST and every SSE heartbeat/event revalidation return the same non-enumerating private-resource behavior for outsiders.
- Owners may read/write without a `game_members` row; `ACTIVE` members may access; candidates, removed members, invited-but-not-active users, and outsiders may not.
- `CLOSED`/`COMPLETED` permits reads to current owner/active members and rejects writes; `OPEN`/`ACTIVE` permits writes only to those same actors.

- [ ] **Step 1: Add failing SSE revocation tests.** Establish a stream as an active member, remove that member in the repository, emit a later event, and assert the event contains no message content and the connection closes/aborts. Also assert an outsider cannot open the stream.
- [ ] **Step 2: Run the focused API tests and confirm Red.** Run `pnpm exec vitest run apps/api/tests/unit/messages/policy.test.ts apps/api/tests/api/messages/routes.test.ts apps/api/tests/integration/postgres-game-messaging.test.ts`. Expected: any missing SSE revocation or lifecycle case fails before code changes.
- [ ] **Step 3: Implement only proven policy/revalidation gaps.** Reuse existing policy and repository boundaries; do not duplicate authorization in React or Redis.
- [ ] **Step 4: Run the same tests and confirm Green.** Expected: owner/member lifecycle matrix passes for REST and SSE, including removal while idle.
- [ ] **Step 5: Commit the independently testable authorization deliverable.** `git add` only policy/repository/handler and corresponding tests, then `git commit -m "test: enforce game message access revocation"`.

## Task 3: Verify text-only accessible UI and align authoritative project docs

**Files:**
- Modify if required: `apps/web/features/messages/game-chat-view.tsx`
- Modify if required: `apps/web/features/games/game-detail-view.tsx`
- Test: `apps/web/tests/game-chat-visual.test.ts`
- Test: `apps/web/tests/game-messages-api.test.ts`
- Modify: `docs/features/015-game-messaging.md`
- Modify: `docs/implementation-plan.md`
- Modify: `docs/project-status.md`
- Modify: `docs/security/authorization-matrix.md`

- [ ] **Step 1: Add failing UI assertions for the approved separation.** Assert the conversation contains only text controls, has no Discord send/copy controls, displays French empty/error/read-only states, and retains visible keyboard focus and live announcements.
- [ ] **Step 2: Run focused web tests and confirm Red only for missing assertions.** Run `pnpm exec vitest run apps/web/tests/game-chat-visual.test.ts apps/web/tests/game-messages-api.test.ts`. Expected: new assertions identify any divergence from the approved text-only, accessible design; existing behavior remains unchanged otherwise.
- [ ] **Step 3: Fix only verified UI gaps.** Keep Tailwind classes in TSX, shared design tokens, no CSS files/style tags/inline style, and no `dangerouslySetInnerHTML`.
- [ ] **Step 4: Update tracking documents.** Record only implemented behavior, TDD evidence, commands/results, known Redis/Discord boundaries, and status `IN_PROGRESS` until the PR is opened. Remove the stale statement that chat is out of scope only by referencing accepted Decision 003/006; do not claim `MERGED`.
- [ ] **Step 5: Run the complete verification set after both plans are implemented.** Run `pnpm lint`, `pnpm typecheck`, all unit/API/component tests, PostgreSQL/Redis integration suites, `pnpm build`, and `docker compose config` using test-only environment values. Expected: every command exits zero; if any check is blocked by environment, record it without weakening or skipping the check.
- [ ] **Step 6: Review, commit, and prepare the PR.** Run `git diff --check`, inspect full diff/status/untracked files and secret scan; commit docs and tests separately from implementation where practical. After both plans’ required checks pass, push this feature branch and open one PR targeting `develop`; provide its link and verification evidence, then stop for the owner’s review. Never approve or merge the PR.

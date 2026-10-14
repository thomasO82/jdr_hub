# Session Scheduling Revisions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the game master edit or cancel a scheduled session and start a separate replacement vote while preserving prior proposals and votes.

**Architecture:** Persist proposal rounds and associate each proposed slot with one round. Keep round transitions and session changes behind scheduling services and repository transactions; expose strict authenticated API commands, then present round history and session actions in the existing GM scheduling panel.

**Tech Stack:** TypeScript, Hono, Zod, Drizzle ORM, PostgreSQL, Next.js App Router, React, Vitest, pnpm.

**Spec:** `docs/superpowers/specs/2026-10-14-session-scheduling-revisions-design.md`

## Global Constraints

- Follow TDD in this order: failing test, verify Red, minimal implementation, verify Green, refactor, rerun.
- All scheduling writes require a valid session, exact application `Origin`, strict Zod input, and MJ ownership enforced by the API.
- Do not rewrite or delete historic votes; a session edit changes only the scheduled session dates.
- Only `SCHEDULED` sessions can be edited or cancelled; `COMPLETED` and `CANCELLED` sessions are terminal.
- One-shot games may have at most three non-cancelled sessions.
- Add an additive migration; do not alter migrations already applied or merged.
- No new dependency, CSS file, inline style, or frontend business rule.
- Update the feature card and project status with actual results; keep the feature `IN_REVIEW` for PR #34.

## Review Focus

- An old `OPEN` proposal row has no stored batch identity; migration groups legacy open proposals by game into one open round, preserving each vote.
- Two simultaneous poll creation requests must not produce two `OPEN` rounds for one game.
- Two simultaneous selections or a selection racing a vote must leave one consistent winner and no votes accepted after selection.
- Editing/cancelling a proposal-backed session must preserve the original proposal dates and vote totals.
- Cancelling one-shot sessions must release only that session's count while still refusing a fourth active/completed session.

---

## File Map

- `packages/shared/src/scheduling.ts` and `packages/shared/tests/scheduling.test.ts`: round status, round/proposal response types, edit-session command, and strict validation.
- `packages/database/src/schema/scheduling.ts`, `packages/database/tests/scheduling-schema.test.ts`, and a new migration under `packages/database/migrations/`: round table, proposal relation, indexes, and legacy backfill.
- `apps/api/src/modules/scheduling/repository.ts`: persistence boundary for rounds, proposal transitions, session edits/cancellation, and round-aware reads.
- `apps/api/src/modules/scheduling/services/`: use cases for creating/selecting proposal rounds and updating/cancelling sessions.
- `apps/api/src/modules/scheduling/handlers.ts` and `routes.ts`: authenticated transport endpoints and strict command parsing.
- `apps/api/tests/helpers/in-memory-scheduling-repository.ts`, `apps/api/tests/unit/scheduling/services.test.ts`, `apps/api/tests/api/scheduling/routes.test.ts`, and `apps/api/tests/integration/scheduling/repository.test.ts`: deterministic, API/security, and PostgreSQL behavior.
- `apps/web/lib/scheduling-api.ts`: typed edit and cancel API methods plus round-aware proposal responses.
- `apps/web/features/gm-management/session-scheduling-panel.tsx`: grouped round history and edit/cancel/new-round interactions.
- `apps/web/tests/session-scheduling-panel.test.tsx`, `apps/web/tests/scheduling-api.test.ts`, and `apps/web/tests/session-scheduling-validation.test.ts`: UI behavior, transport, and form validation.
- `docs/security/authorization-matrix.md`, `docs/features/024-session-scheduling-controls.md`, and `docs/project-status.md`: permission row and truthful PR tracking.

## Task 1: Shared Contracts and Additive Round Schema

**Interfaces:**
- Produce `ProposalRoundStatus = 'OPEN' | 'SELECTED' | 'CLOSED' | 'CANCELLED'`.
- Produce `SchedulingProposal.roundId` and `SchedulingProposal.roundStatus`.
- Produce strict `sessionUpdateInputSchema` for `{ startsAt, endsAt }` and `sessionManagementCommandSchema` for that window or `{ status: 'CANCELLED' }`; update input reuses the existing 15-minute to 24-hour session-window rules.
- Persist `time_proposal_rounds` (`id`, `gameId`, `proposerId`, `status`, timestamps) and nullable-during-backfill then non-null `roundId` on `time_proposals`.

**Files:** shared scheduling contract/tests; database scheduling schema/tests; generated new migration only.

- [ ] **Step 1: Write shared contract tests.** Add tests asserting the round status enum, strict rejection of unknown edit properties, acceptance of a valid window, and rejection of an end at/before start and out-of-range durations.
- [ ] **Step 2: Run the shared contract tests.** Run `pnpm exec vitest run packages/shared/tests/scheduling.test.ts`; expected Red because the new schemas/types are absent.
- [ ] **Step 3: Add the shared contracts.** Implement the enum, round-aware proposal fields, strict session update schema, and strict management command union in `packages/shared/src/scheduling.ts`.
- [ ] **Step 4: Verify shared contracts.** Rerun the focused Vitest command; expected Green.
- [ ] **Step 5: Write schema tests.** Assert round table/columns, proposal round FK, and the database-level uniqueness/index rule for one open round per game.
- [ ] **Step 6: Run schema tests.** Run `pnpm exec vitest run packages/database/tests/scheduling-schema.test.ts`; expected Red on missing round schema.
- [ ] **Step 7: Add round persistence schema and migration.** In the migration, create one `OPEN` round per game with legacy open proposals and attach those proposals; give each legacy terminal proposal its own matching terminal round; preserve votes and session relations. Add a partial unique index for `OPEN` round per game and enforce non-null proposal `roundId` after backfill.
- [ ] **Step 8: Verify schema and migration generation.** Rerun the schema tests and inspect the generated SQL for only additive table/column/index/backfill operations; expected Green and no edits to existing migrations.
- [ ] **Step 9: Commit.** `feat: model scheduling proposal rounds`.

## Task 2: Round Creation, Voting, and Selection Transactions

**Interfaces:**
- Repository methods create a round plus 1–10 proposals atomically, retrieve proposals with round status, select a proposal and close its sibling options atomically, and reject vote writes unless their round and proposal are open.
- `createProposals` always starts a new round and rejects when the game already has an open round.
- `selectProposal` marks its round `SELECTED`, the winner `SELECTED`, siblings `CLOSED`, and creates exactly one `SCHEDULED` session.

**Files:** scheduling repository and proposal use cases; in-memory repository; scheduling service, API, and PostgreSQL integration tests.

- [ ] **Step 1: Write failing service/API tests.** Add tests that selecting one of two same-round options closes its sibling; voting on either option after selection returns 409; a second open round is rejected; a subsequent round after selection receives a different round ID; and the original vote totals remain unchanged.
- [ ] **Step 2: Run targeted tests for Red.** Run the scheduling service and API route test files; expected failures on missing round fields/transitions.
- [ ] **Step 3: Implement round-aware create/list/vote/select services and repository methods.** Use a transaction and row locks for selection and database uniqueness for competing round creation; keep error envelopes generic.
- [ ] **Step 4: Verify Green and concurrency.** Rerun the targeted tests and PostgreSQL scheduling repository integration tests, including concurrent round creation and selection; expected one open round and one scheduled session.
- [ ] **Step 5: Commit.** `fix: close proposal rounds when a slot is selected`.

## Task 3: Edit and Cancel Scheduled Sessions

**Interfaces:**
- Add `updateScheduledSession({ gameId, sessionId, startsAt, endsAt, now })` and `cancelScheduledSession({ gameId, sessionId, now })` to the repository.
- Add `listGameSessions({ gameId, ownerId })` for the owner-only management projection, including `SCHEDULED`, `COMPLETED`, and `CANCELLED` sessions.
- Add use cases that require an existing game, the owner as caller, and a `SCHEDULED` session belonging to that game; editing/cancellation do not rewrite the game status.
- Editing changes only the session window. Cancellation atomically sets the session to `CANCELLED` and its selected round to `CANCELLED`, while retaining proposal and vote rows.
- Transport: `GET /games/:id/sessions`; `PATCH /games/:gameId/sessions/:sessionId` with strict body `{ startsAt, endsAt }` or `{ status: 'CANCELLED' }`.

**Files:** shared schema from Task 1; scheduling repository, services, handlers/routes; in-memory repository; service/API/PostgreSQL tests.

- [ ] **Step 1: Write failing service tests.** Cover owner-only session history including terminal statuses; owner edit success; date update without proposal/vote mutation; owner cancellation; 404 for a session in another game; 409 for `COMPLETED`/`CANCELLED`; and cancelled-session count exclusion for one-shot limits.
- [ ] **Step 2: Run service tests for Red.** Run the scheduling service unit tests; expected missing repository/use-case behavior.
- [ ] **Step 3: Implement edit/cancel use cases and transactional repository methods.** Lock the session row, re-check its status inside the transaction, and update a linked round only on cancellation.
- [ ] **Step 4: Verify service and PostgreSQL tests.** Rerun service tests and add integration assertions for planning exclusion, preserved votes, and rollback-safe transitions; expected Green.
- [ ] **Step 5: Write failing API security tests.** Cover owner-only session listing; unauthenticated, wrong Origin, non-owner, mismatched game/session IDs, invalid/extra fields, invalid interval, terminal status, and successful owner edit/cancel.
- [ ] **Step 6: Run API tests for Red.** Run `pnpm exec vitest run apps/api/tests/api/scheduling/routes.test.ts`; expected routes missing.
- [ ] **Step 7: Add the owner-only GET projection and PATCH route/handler.** Scope mutations to `/games/:gameId/sessions/:sessionId`, parse the strict union `{ startsAt, endsAt } | { status: 'CANCELLED' }`, retain generic error bodies, and preserve authentication, origin, rate-limit, and ownership checks.
- [ ] **Step 8: Verify API security tests.** Rerun the route tests; expected correct 200/400/401/403/404/409 behavior without leaking resource existence.
- [ ] **Step 9: Commit.** `feat: edit and cancel scheduled sessions`.

## Task 4: GM Scheduling Management UI

**Interfaces:**
- API client exposes `listGameSessions(gameId)`, `updateSession(gameId, sessionId, window)`, and `cancelSession(gameId, sessionId)`; both mutations call the PATCH route with the corresponding strict body.
- Round-aware proposal list groups options by `roundId` and displays status and preserved vote counts.
- Scheduled sessions are loaded for the current game so the MJ can edit/cancel them; terminal sessions are read-only.

**Files:** `apps/web/lib/scheduling-api.ts`, `apps/web/features/gm-management/session-scheduling-panel.tsx`, and the three named web tests in the file map.

- [ ] **Step 1: Write API-client tests.** Assert owner session-list URL, PATCH method, encoded game/session IDs, update/cancel request bodies, credentials, and `null` result for failed requests.
- [ ] **Step 2: Run API-client tests for Red.** Run `pnpm exec vitest run apps/web/tests/scheduling-api.test.ts`; expected missing methods.
- [ ] **Step 3: Implement the typed API-client methods.** Do not expose raw response text or transport errors.
- [ ] **Step 4: Verify API-client tests.** Rerun the focused command; expected Green.
- [ ] **Step 5: Write panel tests.** Cover grouped open/selected/cancelled rounds, selected sibling closure, edit form loading and save, confirmation before cancel, terminal-session action hiding, validation errors, and starting a new round after cancellation.
- [ ] **Step 6: Run panel tests for Red.** Run `pnpm exec vitest run apps/web/tests/session-scheduling-panel.test.tsx apps/web/tests/session-scheduling-validation.test.ts`; expected missing controls and grouping.
- [ ] **Step 7: Implement the panel behavior.** Reuse existing Tailwind tokens, date validation, French error translation, accessible labels/focus, and responsive layouts; refresh proposals/planning after each successful mutation.
- [ ] **Step 8: Verify component and accessibility tests.** Rerun focused tests and scheduling/planning accessibility tests; expected Green, no raw API errors, and keyboard-operable confirmation/actions.
- [ ] **Step 9: Commit.** `feat: manage scheduled session changes in GM panel`.

## Task 5: Documentation, Full Verification, and PR Update

**Files:** authorization matrix, feature card 024, project status, and PR #34 description.

- [ ] **Step 1: Update permission/documentation rows.** Document MJ-only edit/cancel, final statuses, historical round preservation, additive migration, and only verified TDD/security/test results; leave status `IN_REVIEW`.
- [ ] **Step 2: Run focused suite.** Run shared scheduling, DB schema, API unit/API/integration scheduling, web API/panel/validation, and planning accessibility tests; expected all Green.
- [ ] **Step 3: Run required project checks.** Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:integration` against the configured test database, and `pnpm build`; expected zero failures. Do not run against production data.
- [ ] **Step 4: Review migration and diff.** Confirm no protected tests or applied migrations changed, no secret/temporary files, `git diff --check` clean, and migration adds only round/session behavior described in the spec.
- [ ] **Step 5: Update coverage and manual review notes.** Record actual results and any limits in the feature card; check keyboard operation and mobile/desktop layout in the GM panel.
- [ ] **Step 6: Commit documentation and verification record.** `docs: track session scheduling revisions`.
- [ ] **Step 7: Push the existing PR branch and update PR #34.** Include migration, transitions, security, TDD evidence, all commands/results, and manual review points; do not merge.

## Self-Review

- Spec coverage: rounds/history and sibling closure (Task 2); edit/cancel and terminal states (Task 3); MJ UI, French validation and responsive/accessibility behavior (Task 4); one-shot count, authorization matrix, verification, and PR tracking (Tasks 1–5).
- Step granularity: every test Red/Green cycle is a discrete step; DB migration, API operations, UI, docs, and verification have separate reviewable deliverables.
- Type consistency: shared contracts define `roundId`, `roundStatus`, session update input and round status before API/repository consumers use them.
- Review Focus: all five risks have named coverage in Tasks 1–3.
- Proportion: tasks are limited to the behavior approved in the design; no XP, notification, or external calendar behavior is added.

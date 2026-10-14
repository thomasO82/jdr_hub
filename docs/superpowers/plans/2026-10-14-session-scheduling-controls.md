# Session scheduling controls implementation plan

> **For agentic workers:** follow `superpowers:executing-plans` and preserve the project TDD order.

**Goal:** Let a game master schedule a fixed session or collect votes on proposed slots from the existing game management page, and let players reach pending votes from their dashboard.

**Architecture:** Extend the existing `Séances` panel in `GmManagementView` using `createSchedulingApi` and existing F06 endpoints. Load proposal state for the managed game, allow the owner to select a proposal into a scheduled session, and expose a vote link from dashboard `VOTE` actions. Keep authorization, one-shot limits, date validation, and persistence in the existing API. No schema or dependency changes.

**Tech Stack:** Next.js App Router, React client components, TypeScript, Tailwind CSS v4, shared scheduling API, Vitest.

**Sources:** `docs/specifications/cahier-des-charges.md` (one-shot/session lifecycle and scheduling flow), `docs/implementation-plan.md` (F06), `docs/security/security-requirements.md`, `docs/features/012-sessions-scheduling.md`, and the existing desktop/mobile vote and planning references.

## Constraints

- A one-shot remains capped at three sessions; the API remains authoritative for that limit.
- Fixed sessions and proposals use the existing UTC-aware input contracts and authenticated API.
- A proposal becomes scheduled only after an explicit game-master selection.
- Only authorized active players can vote; existing API controls remain authoritative.
- Keep French user-facing messages, Tailwind-only styling, keyboard access, and responsive layouts.
- Do not modify existing F06 API or security tests unless a proven defect requires separate owner approval.

## Tasks

### 1. Define UI behavior with failing tests

- Add focused component coverage for the management `Séances` panel: fixed-session form, proposal-slot form, loading/error/success feedback, and the existing one-shot type passed into the view.
- Add coverage that the manager can explicitly select an open proposal and that the action calls the existing session API with its proposal ID.
- Add dashboard coverage that a `VOTE` action links to `/parties/{gameId}/vote` and other action types keep their current behavior.
- Run the new focused tests and confirm they fail because the controls and links do not exist yet.

### 2. Add the management controls

- Add date/time fields for a fixed session and submit the existing `createSession(gameId, { startsAt, endsAt })` contract.
- Add a repeatable list of one to ten date/time ranges and submit them through `createProposals(gameId, slots)`.
- Load proposals for the managed game, show their dates and vote counts, and offer an explicit selection action for open proposals using `createSession(gameId, { proposalId })`.
- Translate API failures into French guidance; retain field values after failure and prevent duplicate submissions while a request is pending.
- Display successful creation/selection feedback and refresh the relevant proposal state.

### 3. Make player voting reachable

- Turn dashboard `VOTE` actions into keyboard-accessible links to the existing vote page using the action's game ID.
- Keep the vote page's current API authorization and error states.

### 4. Record the feature and verify

- Create a feature record in `docs/features/` and update `docs/project-status.md` with actual implementation, TDD evidence, security checks, verification results, limitations, and `IN_REVIEW` status.
- Run focused tests first, then the relevant full web tests, lint, typecheck, and build; run responsive/browser checks if the installed browser tooling permits it.
- Review `git diff`, status, tracked/untracked files, and secrets before committing.
- Commit the feature, push the dedicated branch, and open a PR targeting `develop`; stop for the owner's review and merge.

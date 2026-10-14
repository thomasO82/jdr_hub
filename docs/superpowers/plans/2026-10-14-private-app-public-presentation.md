# Pages privées et présentation publique Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendre `/` (présentation) et `/connexion` accessibles sans session et bloquer côté serveur le rendu de toute autre page jusqu'à validation de la session par Hono.

**Architecture:** Le cookie d'accès reste émis par Hono en `HttpOnly`, mais passe à `Path=/` pour être présent sur les requêtes de page. Le proxy Next.js appelle `/me` sur `API_INTERNAL_URL`, transmet uniquement ce cookie, et échoue fermé. Les API gardent leurs contrôles actuels ; le garde serveur ne les remplace pas.

**Tech Stack:** Next.js 16 App Router `proxy.ts`, Hono, TypeScript strict, Vitest, React Server Components, Tailwind CSS v4.

**Spec:** `docs/superpowers/specs/2026-10-14-private-app-public-presentation-design.md`

## Global Constraints

- Les seules pages sans session sont `/` et `/connexion`.
- Le cookie d'accès reste `HttpOnly`, `SameSite=Lax`, `Secure` en production et conserve sa durée d'expiration actuelle.
- Le cookie de renouvellement reste limité à `/api/auth`.
- Le proxy transmet à Hono seulement le cookie d'accès ; Hono vérifie signature, expiration, révocation et compte actif.
- Une réponse Hono `401` redirige vers `/connexion` ; une panne ou réponse inconnue ne rend jamais une page privée.
- Les routes API et les ressources statiques nécessaires à la landing ne sont pas bloquées par le proxy de pages.
- L'interface reste Tailwind CSS v4 uniquement, avec le logo officiel non modifié et les fontes/tokens globaux existants.
- Les endpoints Hono `public/*` restent hors périmètre.

## Review Focus

- Ancien cookie d'accès à `Path=/api` encore présent dans le navigateur : supprimer le chemin historique lors du login, du refresh et du logout sans laisser deux cookies de même nom.
- Session révoquée avec JWT encore non expiré : Hono répond `401`, le proxy redirige vers `/connexion`.
- API d'authentification indisponible ou réponse `5xx` : refuser fermé avec réponse temporaire, sans effacer de cookie.
- Routes avec slash final et routes profondes : appliquer la règle privée uniformément, sans laisser de sous-page ouverte.
- Fichiers statiques, `/api/*`, `/robots.txt` et `/sitemap.xml` : ne pas les rediriger comme des pages applicatives.

---

### Task 1: Portée et migration du cookie d'accès

**Files:**
- Modify: `apps/api/src/modules/auth/cookies.ts`
- Test: `apps/api/tests/api/auth/routes-jwt.test.ts`
- Test: `apps/api/tests/api/auth/routes.test.ts`

**Interfaces:**
- Keep: `setAuthCookies(c, config, accessToken, refreshToken, refreshExpiresAt, now): void`.
- Keep: `clearAuthCookies(c, config): void`.
- Change access cookie path to `/`; keep refresh cookie path `/api/auth`.

- [x] **Step 1: Write failing cookie scope and migration assertions**

Extend the auth route tests to assert access cookies use `Path=/`, refresh cookies use `Path=/api/auth`, and login/refresh/logout expire the old access cookie at `Path=/api` as well as clearing the active `Path=/` cookie on logout.

- [x] **Step 2: Verify RED**

Run: `pnpm exec vitest run apps/api/tests/api/auth/routes-jwt.test.ts apps/api/tests/api/auth/routes.test.ts`
Expected: the new access-path and legacy-path assertions fail against the current `/api` implementation.

- [x] **Step 3: Implement the cookie migration**

Set the access cookie at `/`; retain its name, expiry, `HttpOnly`, `SameSite=Lax`, and production `Secure` attributes. Clear the former `/api` access-cookie variant during login and refresh. On logout, expire both `/` and `/api` variants. Do not widen the refresh-cookie path.

- [x] **Step 4: Verify GREEN**

Run: `pnpm exec vitest run apps/api/tests/api/auth/routes-jwt.test.ts apps/api/tests/api/auth/routes.test.ts`
Expected: all tests pass, including cookie migration and refresh/logout behavior.

- [x] **Step 5: Commit**

```bash
git add apps/api/src/modules/auth/cookies.ts apps/api/tests/api/auth/routes-jwt.test.ts apps/api/tests/api/auth/routes.test.ts
git commit -m "fix: scope access cookie for server page checks"
```

### Task 2: Server-side page guard

**Files:**
- Create: `apps/web/proxy.ts`
- Create: `apps/web/lib/server-page-access.ts`
- Test: `apps/web/tests/server-page-access.test.ts`
- Modify: `apps/web/features/authentication/private-page-gate.tsx`
- Modify: `apps/web/lib/page-access.ts`

**Interfaces:**
- Produce `checkServerPageAccess(pathname: string, accessCookie: string | undefined, fetcher?: typeof fetch): Promise<'public' | 'authenticated' | 'login-required' | 'unavailable'>` in `apps/web/lib/server-page-access.ts`.
- Produce Next.js `proxy(request: NextRequest): Promise<NextResponse>` in `apps/web/proxy.ts`.
- Public page allowlist is exact: `/` and `/connexion` (optional trailing slash normalized).

- [x] **Step 1: Write failing guard tests**

Add cases for exact public routes; anonymous private routes and deep routes; Hono `200`, `401`, unexpected `5xx`; API URL resolution from `API_INTERNAL_URL`; forwarding only `jdr_hub_access`; and bypasses for API/static metadata resources. Assert that a `5xx` returns `unavailable`, not `login-required`.

- [x] **Step 2: Verify RED**

Run: `pnpm exec vitest run apps/web/tests/server-page-access.test.ts`
Expected: FAIL because the server guard and its interface do not exist.

- [x] **Step 3: Implement session check and proxy**

Call `${API_INTERNAL_URL}/me` with `cache: 'no-store'` and a `Cookie` header containing only the access cookie. Do not parse the JWT in Next.js. Redirect private-page `401` responses to `/connexion`, return a non-cacheable `503` response on private-page API failure or unrecognized status, and allow private pages only for `200`. If verification fails on the public `/` page, keep serving the presentation rather than blocking it. Exclude `/api/*`, `_next` assets, known public assets, `/robots.txt`, and `/sitemap.xml` from page checks. A valid session on `/` redirects to `/dashboard`.

- [x] **Step 4: Remove the client-only security boundary**

Remove `PrivatePageGate` from the root layout and delete the obsolete component once no route uses it. Keep `page-access.ts` only if it remains useful to the testable public-page policy; otherwise replace it with the server helper rather than duplicate allowlists.

- [x] **Step 5: Verify GREEN**

Run: `pnpm exec vitest run apps/web/tests/server-page-access.test.ts apps/web/tests/private-page-access.test.ts`
Expected: all anonymous, authenticated, revoked, unavailable, deep-route, and bypass cases pass.

- [x] **Step 6: Commit**

```bash
git add apps/web/proxy.ts apps/web/lib/server-page-access.ts apps/web/tests/server-page-access.test.ts apps/web/features/authentication/private-page-gate.tsx apps/web/lib/page-access.ts apps/web/app/layout.tsx
git commit -m "feat: guard application pages before server rendering"
```

### Task 3: Public presentation page

**Files:**
- Create: `apps/web/features/home/landing-view.tsx`
- Modify: `apps/web/app/page.tsx`
- Test: `apps/web/tests/landing-view.test.ts`
- Modify: `apps/web/app/globals.css`, `docs/design-system.md`
- Modify: `apps/web/tests/dashboard-pages.test.ts`, `apps/web/tests/dashboard-visual.test.ts` (their root-route contract is superseded by the approved spec)

**Interfaces:**
- Produce `LandingView(): React.JSX.Element` in `apps/web/features/home/landing-view.tsx`.
- `/` renders the presentation for visitors and remains under proxy policy `public`.

- [x] **Step 1: Write failing landing assertions**

Use `react-dom/server` to render `LandingView` and assert a French presentation heading, the official logo path `/branding/logo.svg`, a CTA to `/connexion`, feature descriptions, and absence of public game links or external demo images.

- [x] **Step 2: Verify RED**

Run: `pnpm exec vitest run apps/web/tests/landing-view.test.ts`
Expected: FAIL because `LandingView` does not exist.

- [x] **Step 3: Implement the landing**

Use the desktop D01 composition and adapt it responsively: public header, hero, clear Discord sign-in CTA, capability cards for implemented functionality, and public footer. Use Tailwind tokens, Hanken Grotesk/Inter/Geist roles, Lucide icons, and the official logo. Define the documented inverse palette as `@theme` tokens in the global Tailwind entrypoint. Do not show public games or route links that now require a session. Do not use Stitch demo assets or external user imagery.

- [x] **Step 4: Verify GREEN**

Run: `pnpm exec vitest run apps/web/tests/landing-view.test.ts`
Expected: landing markup and public navigation assertions pass.

- [x] **Step 5: Commit**

```bash
git add apps/web/features/home/landing-view.tsx apps/web/app/page.tsx apps/web/tests/landing-view.test.ts
git commit -m "feat: add public JDR Hub presentation page"
```

### Task 4: Remove public page indexing and record the decision

**Files:**
- Modify: `apps/web/app/sitemap.ts`
- Modify: `apps/web/app/robots.ts`
- Create: `docs/decisions/007-private-pages-public-presentation.md`
- Modify: `docs/decisions/README.md`
- Modify: `docs/features/023-game-creation-access-and-discovery.md`
- Modify: `docs/project-status.md`
- Modify: `docs/security/authorization-matrix.md`

**Interfaces:**
- Sitemap contains only `/`.
- Decision 007 supersedes F03's visitor-facing page policy while preserving historical F03 implementation details and the out-of-scope public API behavior.

- [x] **Step 1: Write failing sitemap assertion**

Add a focused test for `sitemap()` asserting the only URL is the configured site origin plus `/`, and that it does not call `API_INTERNAL_URL` for game slugs.

- [x] **Step 2: Verify RED**

Run: `pnpm exec vitest run apps/web/tests/sitemap.test.ts`
Expected: FAIL because the current sitemap includes `/parties` and public slugs.

- [x] **Step 3: Update SEO outputs and project records**

Return only `/` from the sitemap. Keep crawler guidance explicit that app routes require login, while noting robots directives are not access controls. Add decision 007 and link it from the decision index; update FIX-UX-001's feature record and project-status entry to describe the final private-page policy and current PR without changing historical F03's merged status.

- [x] **Step 4: Verify GREEN**

Run: `pnpm exec vitest run apps/web/tests/sitemap.test.ts`
Expected: root is the only sitemap entry; no game slug API is called.

- [x] **Step 5: Commit**

```bash
git add apps/web/app/sitemap.ts apps/web/app/robots.ts apps/web/tests/sitemap.test.ts docs/decisions/007-private-pages-public-presentation.md docs/decisions/README.md docs/features/023-game-creation-access-and-discovery.md docs/project-status.md docs/security/authorization-matrix.md
git commit -m "docs: record private app page policy"
```

### Task 5: Full verification and PR update

**Files:**
- Verify all changed source, tests, docs, and feature tracking files.

- [x] Run targeted auth, page guard, landing and sitemap tests; verify each added test first failed for its intended reason.
- [x] Run the full repository test command used on PR #33, excluding ignored `.superpowers` scratch files as already documented.
- [x] Run `pnpm lint` and `pnpm build`.
- [x] Review responsive behavior at desktop/mobile using the available browser tool; if Browser and Playwright remain unavailable, record the exact blocker and keep manual QA in the PR checklist. **Browser/Playwright unavailable; manual visual QA remains.**
- [x] Review `git diff --check`, `git status`, changed tests, secrets, cookie attributes, route matcher, docs, and coverage. **Coverage not measured.**
- [x] Update the feature record with fresh commands/results, TDD Red/Green evidence, security checks, limitations and manual verification.
- [ ] Update PR #33 and push this branch; do not merge. Report the PR and stop for owner review.

## Self-review

- **Spec coverage:** route access and session validation are Task 2; cookie path and migration Task 1; public presentation Task 3; sitemap/robots and decision records Task 4; end-to-end evidence and PR update Task 5.
- **Failure conditions:** revoked session, API outage, unexpected status, duplicate legacy cookie, deep routes, static assets, and API bypasses are included in tests or proxy matcher review.
- **Type consistency:** the guard returns the four-state union `public | authenticated | login-required | unavailable`; `proxy` maps `public`/`authenticated` to pass-through, `login-required` to `/connexion`, and `unavailable` to a non-cacheable `503`.
- **Scope:** no dependency is added, API public endpoints remain unchanged, and no test outside the auth cookie assertions should need expectation changes.


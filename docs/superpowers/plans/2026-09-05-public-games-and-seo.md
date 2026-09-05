# Public Games and SEO Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Exposer un catalogue public sûr et ses pages SSR indexables, sans rendre de champs privés ni modifier les parcours authentifiés existants.

**Architecture:** Le module Hono `games` ajoute une frontière de lecture publique avec des DTO explicitement projetés. Un client Next.js serveur consomme ces DTO depuis des Server Components ; les métadonnées, URLs canoniques, sitemap et robots sont générés côté serveur.

**Tech Stack:** Hono, TypeScript strict, Zod, Drizzle/PostgreSQL, Next.js App Router, Tailwind CSS v4, React Server Components, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-05-public-games-seo-design.md`

## Global Constraints

- Les routes CRUD F02 et leurs réponses restent compatibles ; les routes `/public/*` utilisent une projection sans identifiant interne.
- Les parties publiques sont limitées aux statuts `OPEN` et `ACTIVE` et à la visibilité `PUBLIC`.
- Les filtres multi-tags utilisent une logique `AND` et la pagination est bornée à 50 éléments.
- Aucun repository, service ou composant public ne lit PostgreSQL dans le navigateur.
- Les projections publiques n’exposent pas `id`, `ownerId`, `discordId`, session, disponibilité, candidature, adresse ou token.
- Les requêtes Drizzle restent paramétrées ; les paramètres sont validés par Zod strict.
- Les pages utilisent exclusivement Tailwind v4 et les tokens de `docs/design-system.md`.
- Aucun secret réel, cookie, token ou donnée personnelle inutile ne doit apparaître dans le code, le HTML, les métadonnées ou le sitemap.
- Les tests existants restent inchangés et aucun test n’est ignoré, affaibli ou supprimé.

---

### Task 1: Définir les contrats publics et la politique d’indexation

**Files:**
- Create: `packages/shared/src/public-games.ts`
- Modify: `packages/shared/src/index.ts`
- Test: `packages/shared/tests/public-games.test.ts`
- Create: `apps/web/lib/public-seo.ts`
- Test: `apps/web/tests/public-seo.test.ts`

**Interfaces:**
- Consumes: `gameTypeSchema`, `gameStatusSchema`, `tagSlugSchema` et les règles SEO F03.
- Produces: `PublicGame`, `PublicGamesPage`, `PublicCollection`, `publicGamesQuerySchema`, `slugifyPublicLabel`, `isIndexableGamesQuery` et `canonicalForPublicPath`.

- [ ] **Step 1: Write the failing tests**

```ts
it('accepts bounded public filters and rejects unknown keys', () => {
  expect(publicGamesQuerySchema.parse({ q: 'crypte', tagSlugs: ['horreur'], page: 1 }).page).toBe(1)
  expect(publicGamesQuerySchema.safeParse({ unknown: 'x' }).success).toBe(false)
  expect(publicGamesQuerySchema.safeParse({ pageSize: 51 }).success).toBe(false)
})

it('never marks free searches as indexable', () => {
  expect(isIndexableGamesQuery({})).toBe(true)
  expect(isIndexableGamesQuery({ q: 'crypte' })).toBe(false)
  expect(isIndexableGamesQuery({ page: 2 })).toBe(false)
})

it('normalizes labels into stable public slugs', () => {
  expect(slugifyPublicLabel('L’Appel de Cthulhu')).toBe('l-appel-de-cthulhu')
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run packages/shared/tests/public-games.test.ts apps/web/tests/public-seo.test.ts`

Expected: FAIL because the public schemas and SEO helpers do not exist.

- [ ] **Step 3: Write the minimal contracts**

`PublicGame` contains only `slug`, `title`, `system`, `description`, `type`, `status`, `maxPlayers`, `tags` and `{ slug, name }` for the public MJ. `PublicGamesPage` contains `items`, `page` and `pageSize`. `PublicCollection` contains a public `slug`, `name` and `games: PublicGame[]`.

`publicGamesQuerySchema` accepts `q`, `gmId`, `gmName`, repeated `tagSlugs`, `page` (1–100) and `pageSize` (1–50), then strips no unknown key because it is strict. `public-seo.ts` implements slug normalization and returns `false` for `q`, `gmId`, `gmName`, non-empty `tagSlugs` or `page > 1`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run packages/shared/tests/public-games.test.ts apps/web/tests/public-seo.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/public-games.ts packages/shared/src/index.ts packages/shared/tests/public-games.test.ts apps/web/lib/public-seo.ts apps/web/tests/public-seo.test.ts
git commit -m "test: define public games contracts and SEO policy"
```

### Task 2: Ajouter la lecture publique Hono avec projection sûre

**Files:**
- Modify: `apps/api/src/modules/games/repository.ts`
- Create: `apps/api/src/modules/games/services/list-public-games.ts`
- Create: `apps/api/src/modules/games/services/get-public-collection.ts`
- Modify: `apps/api/src/modules/games/handlers.ts`
- Modify: `apps/api/src/modules/games/routes.ts`
- Modify: `apps/api/tests/helpers/in-memory-games-repository.ts`
- Test: `apps/api/tests/api/games/public-routes.test.ts`
- Test: `apps/api/tests/unit/games/public-services.test.ts`

**Interfaces:**
- Consumes: `PublicGame`, `PublicGamesPage`, `PublicCollection` et `publicGamesQuerySchema` de Task 1.
- Produces: `PublicGamesRepository`, `listPublicGames`, `getPublicCollection`, routes `GET /public/games`, `GET /public/games/:slug`, `GET /public/gms/:slug`, `GET /public/tags/:slug` et `GET /public/systems/:slug`.

- [ ] **Step 1: Write the failing API and service tests**

```ts
it('returns only a safe projection for the public catalogue', async () => {
  const response = await app.request('/public/games')
  expect(response.status).toBe(200)
  const game = (await response.json()).data.items[0]
  expect(game).toMatchObject({ slug: 'crypte', title: 'La Crypte' })
  expect(game).not.toHaveProperty('id')
  expect(game).not.toHaveProperty('ownerId')
})

it('hides private, draft and closed games behind the same public absence', async () => {
  expect((await app.request('/public/games/privee')).status).toBe(404)
  expect((await app.request('/public/games/brouillon')).status).toBe(404)
  expect((await app.request('/public/games/fermee')).status).toBe(404)
})

it('requires every requested tag in public search', async () => {
  const result = await listPublicGames({ query: { tagSlugs: ['horror', 'online'], page: 1, pageSize: 20 }, repository })
  expect(result.items.map((game) => game.slug)).toEqual(['crypte-complete'])
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run apps/api/tests/api/games/public-routes.test.ts apps/api/tests/unit/games/public-services.test.ts`

Expected: FAIL because the public repository interface, handlers and routes are absent.

- [ ] **Step 3: Implement the repository boundary**

Add `PublicGamesRepository` methods returning shared public DTOs. In PostgreSQL, select explicit game columns, join `users` only for `username`, and load active tag names/slugs. Convert usernames and systems with `slugifyPublicLabel`; when a slug collides, include all matching public values instead of returning an internal identifier. Keep `GamesRepository` CRUD methods unchanged.

The list query applies `PUBLIC` + (`OPEN` or `ACTIVE`), bounded pagination, case-insensitive title/MJ search and the existing grouped `AND` tag condition. Public detail and collections return `null` when no eligible resource exists. No returned object may contain database IDs.

- [ ] **Step 4: Add services, handlers and routes**

`listPublicGames` delegates only to `PublicGamesRepository.listPublic`. `getPublicCollection` delegates to the appropriate collection method. Handlers parse query/slug, call one service and return the existing `{ data, error, meta }` envelope; invalid input is `400` and absent public resources are `404`.

Register the five `/public/*` GET routes without authentication or cookies. Keep all existing `/games`, `/tags` and owner-protected handlers untouched except for reusing internal repository helpers.

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm exec vitest run apps/api/tests/api/games/public-routes.test.ts apps/api/tests/unit/games/public-services.test.ts`

Expected: PASS, including private-resource hiding, safe projection, `AND` tags, pagination limits, accents and slug collisions.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/games apps/api/tests/api/games/public-routes.test.ts apps/api/tests/unit/games/public-services.test.ts apps/api/tests/helpers/in-memory-games-repository.ts
git commit -m "feat: expose safe public games queries"
```

### Task 3: Brancher le client serveur Next.js et le catalogue SSR

**Files:**
- Create: `apps/web/lib/public-games-api.ts`
- Modify: `apps/web/app/parties/page.tsx`
- Modify: `apps/web/features/games/games-list-view.tsx`
- Modify: `apps/web/features/games/game-detail-view.tsx`
- Modify: `apps/web/app/parties/[slug]/page.tsx`
- Test: `apps/web/tests/public-games-api.test.ts`
- Test: `apps/web/tests/public-pages.test.ts`

**Interfaces:**
- Consumes: public DTOs and Hono routes from Tasks 1–2, `API_INTERNAL_URL` and Tailwind shell.
- Produces: `createPublicGamesApi`, SSR catalogue/detail and safe public card data.

- [ ] **Step 1: Write the failing tests**

```ts
it('calls the public endpoint and keeps filters in the query string', async () => {
  const requests: string[] = []
  const api = createPublicGamesApi({ baseUrl: 'http://api.test', fetcher: async (input) => {
    requests.push(String(input))
    return new Response(JSON.stringify({ data: { items: [], page: 1, pageSize: 20 } }), { status: 200 })
  } })
  await api.list({ q: 'crypte', tagSlugs: ['horror', 'online'], page: 1, pageSize: 20 })
  expect(requests[0]).toContain('/public/games?q=crypte&tagSlugs=horror&tagSlugs=online')
})

it('renders the catalogue content in the server component output', async () => {
  const html = await renderGamesPage({ q: 'crypte' })
  expect(html).toContain('Catalogue de Parties')
  expect(html).toContain('La Crypte')
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run apps/web/tests/public-games-api.test.ts apps/web/tests/public-pages.test.ts`

Expected: FAIL because the public client and SSR test helpers are absent.

- [ ] **Step 3: Implement the server API client**

`createPublicGamesApi({ baseUrl?, fetcher? })` reads `API_INTERNAL_URL` only as a server default, requests `/public/*` with `accept: application/json` and `cache: 'no-store'`, and returns `null` for transport or non-2xx failures. It never forwards cookies or authorization headers.

- [ ] **Step 4: Implement catalogue and detail rendering**

Update the Server Components to consume only `PublicGame`. Keep the D02/D05 Tailwind composition, shell, French copy, accessible labels, empty state and generic error state. Build query strings with `URLSearchParams`, repeat `tagSlugs`, and preserve only the allowlisted filters. Use `notFound()` for missing detail resources.

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm exec vitest run apps/web/tests/public-games-api.test.ts apps/web/tests/public-pages.test.ts apps/web/tests/games-pages.test.ts`

Expected: PASS without exposing `id` or `ownerId` in the public view model.

- [ ] **Step 6: Commit**

```bash
git add apps/web/lib/public-games-api.ts apps/web/app/parties apps/web/features/games apps/web/tests/public-games-api.test.ts apps/web/tests/public-pages.test.ts
git commit -m "feat: render public games catalogue server-side"
```

### Task 4: Ajouter les pages éditoriales et les métadonnées SEO

**Files:**
- Create: `apps/web/app/mj/[slug]/page.tsx`
- Create: `apps/web/app/tags/[slug]/page.tsx`
- Create: `apps/web/app/jeux/[slug]/page.tsx`
- Create: `apps/web/features/games/public-collection-view.tsx`
- Modify: `apps/web/app/parties/page.tsx`
- Modify: `apps/web/app/parties/[slug]/page.tsx`
- Create: `apps/web/app/sitemap.ts`
- Create: `apps/web/app/robots.ts`
- Modify: `apps/web/lib/public-seo.ts`
- Test: `apps/web/tests/seo-pages.test.ts`

**Interfaces:**
- Consumes: `createPublicGamesApi`, `PublicCollection`, `isIndexableGamesQuery` and `canonicalForPublicPath`.
- Produces: SSR pages and metadata for all five public URL families, sitemap and robots.

- [ ] **Step 1: Write the failing tests**

```ts
it('marks filtered catalogue results noindex and keeps a canonical URL', async () => {
  const metadata = await generateGamesMetadata({ searchParams: Promise.resolve({ q: 'crypte' }) })
  expect(metadata.robots).toEqual({ index: false, follow: true })
  expect(metadata.alternates?.canonical).toBe('/parties')
})

it('generates only public URLs in sitemap and blocks private areas in robots', async () => {
  const entries = await sitemap()
  expect(entries.map((entry) => entry.url)).not.toContain(expect.stringContaining('/dashboard'))
  expect(robots().rules).toEqual(expect.objectContaining({ disallow: expect.arrayContaining(['/dashboard', '/planning', '/profil']) }))
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run apps/web/tests/seo-pages.test.ts`

Expected: FAIL because metadata helpers, editorial pages, sitemap and robots are absent.

- [ ] **Step 3: Implement dynamic metadata and canonical policy**

Use one public site URL helper with `PUBLIC_SITE_URL` and the development fallback `http://localhost:18080`. Add bounded descriptions, page-specific titles, absolute Open Graph URLs and `noindex,follow` for free searches, non-default pagination and arbitrary filter combinations. Missing public resources call `notFound()` before metadata is returned.

- [ ] **Step 4: Implement MJ, tag and system pages**

Each page calls one public collection method, renders `PublicCollection` with the shared Tailwind collection view, uses a semantic `h1`, links each card to `/parties/[slug]`, and renders a generic empty/not-found state without leaking internal identifiers.

- [ ] **Step 5: Implement sitemap and robots**

`sitemap.ts` asks the public API for deterministic game, MJ, tag and system slugs, deduplicates URLs and returns only indexable routes. `robots.ts` allows public pages and disallows dashboard, planning, profile, management and query-heavy paths without including secrets or private IDs.

- [ ] **Step 6: Run tests to verify they pass**

Run: `pnpm exec vitest run apps/web/tests/seo-pages.test.ts apps/web/tests/public-pages.test.ts`

Expected: PASS with SSR content, canonical, Open Graph, noindex, sitemap and robots assertions.

- [ ] **Step 7: Commit**

```bash
git add apps/web/app apps/web/features/games/public-collection-view.tsx apps/web/lib/public-seo.ts apps/web/tests/seo-pages.test.ts
git commit -m "feat: add public SEO pages and metadata"
```

### Task 5: Vérification sécurité, suivi et livraison

**Files:**
- Modify: `apps/api/tests/api/games/public-routes.test.ts`
- Modify: `apps/web/tests/seo-pages.test.ts`
- Modify: `docs/features/006-public-games-and-seo.md`
- Modify: `docs/project-status.md`

**Interfaces:**
- Consumes: implementation complète des Tasks 1–4.
- Produces: preuve TDD, contrôles de sécurité et branche prête pour revue.

- [ ] **Step 1: Add security regression cases**

Add tests for `<script>alert(1)</script>` rendered as escaped text, oversized `q`/`pageSize`, invalid tag slugs, private/draft/closed slugs, absence of `ownerId`/`discordId`, and public routes without cookies. Do not alter existing assertions; add cases only.

- [ ] **Step 2: Run the complete verification**

Run:

```bash
pnpm test
pnpm lint
pnpm typecheck
pnpm build
git diff --check
```

Expected: all tests, lint, typecheck and builds pass. If Turbopack is blocked by the sandbox port restriction, rerun only `pnpm build` with the approved escalated command and record that cause.

- [ ] **Step 3: Review the public diff and secrets**

Run `git status --short --branch`, inspect `git diff --stat origin/develop...HEAD`, and verify only `.env.example` contains an environment filename. Confirm no real secret, token, cookie, private identifier or forbidden file is present.

- [ ] **Step 4: Complete feature tracking**

Update `docs/features/006-public-games-and-seo.md` with actual files, routes, tests, Red/Green/Refactor evidence, security results, manual checks and limits. Set the status to `IN_REVIEW` only once a Pull Request exists; keep it `IN_PROGRESS` otherwise. Update the corresponding row in `docs/project-status.md`.

- [ ] **Step 5: Commit documentation**

```bash
git add apps/api/tests/api/games/public-routes.test.ts apps/web/tests/seo-pages.test.ts docs/features/006-public-games-and-seo.md docs/project-status.md
git commit -m "docs: record public games SEO verification"
```

- [ ] **Step 6: Push the dedicated branch**

```bash
git push -u origin feat/public-games-and-seo
```

Expected: branch is available for a Pull Request targeting `develop`; the owner reviews and merges it.

# Monorepo Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construire le socle F00 reproductible de JDR Hub avec un workspace pnpm, Next.js, Hono, PostgreSQL, Docker Compose, routage same-origin et CI sécurisée.

**Architecture:** Le dépôt reste un monorepo modulaire composé de `apps/web`, `apps/api` et de packages partagés. Un reverse proxy local route `/` vers Next.js et `/api/*` vers Hono ; PostgreSQL reste sur un réseau Docker interne. Les contrats partagés ne contiennent que des types et schémas nécessaires, et le frontend n’importe jamais la base de données dans le navigateur.

**Tech Stack:** pnpm, TypeScript strict, Next.js App Router, Hono, Zod, Drizzle ORM, PostgreSQL, Docker Compose, reverse proxy Caddy, Vitest, Playwright et GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-02-monorepo-foundation-design.md`

## Global Constraints

- Utiliser un monorepo pnpm.
- Utiliser Next.js avec App Router et TypeScript strict pour le frontend.
- Utiliser Hono et TypeScript strict pour l’API REST.
- Hono reste un monolithe modulaire ; aucun microservice.
- Utiliser Drizzle ORM pour PostgreSQL.
- PostgreSQL n’est pas exposé publiquement et rejoint un réseau Docker interne.
- Les contrats réellement partagés vivent dans `packages/shared`.
- Ne jamais importer le package de base de données dans du code frontend exécuté dans le navigateur.
- Utiliser des images Docker minimales et épinglées, des builds multi-stage, des healthchecks et des conteneurs non-root.
- Les secrets viennent de variables d’environnement ou d’un gestionnaire de secrets ; `.env.example` ne contient que des valeurs manifestement factices.
- Ne pas créer de migration métier dans F00.
- Toute branche de fonctionnalité part de `develop` propre et à jour et toute PR de fonctionnalité cible `develop`.
- `main` reste protégée ; sa promotion depuis `develop` est séparée et validée par le propriétaire.
- Écrire les tests avant le code et consigner Red, Green, Refactor dans la fiche F00.
- Ne jamais lire, afficher, copier ou versionner les fichiers et valeurs interdits par `docs/security/ai-access-policy.md`.

## File Map

### Fichiers racine

- Create: `package.json` — scripts workspace et version du gestionnaire pnpm utilisée.
- Create: `pnpm-workspace.yaml` — membres `apps/*` et `packages/*`.
- Create: `tsconfig.base.json` — options TypeScript strict communes.
- Modify: `.gitignore` — uniquement les exclusions nécessaires au workspace, sans retirer les protections existantes.

### Applications et packages

- Create: `apps/web/package.json`, `apps/web/tsconfig.json`, `apps/web/next.config.ts`, `apps/web/app/layout.tsx`, `apps/web/app/page.tsx`.
- Create: `apps/api/package.json`, `apps/api/tsconfig.json`, `apps/api/src/app.ts`, `apps/api/src/index.ts`, `apps/api/src/app.test.ts`.
- Create: `packages/shared/package.json`, `packages/shared/src/index.ts`, `packages/shared/tsconfig.json`.
- Create: `packages/database/package.json`, `packages/database/src/index.ts`, `packages/database/tsconfig.json`.
- Create: `packages/ui/package.json` et `packages/ui/src/index.ts` seulement si la page technique partage une primitive ; sinon ne pas créer ce package.

### Infrastructure et qualité

- Create: `docker-compose.yml` — services, réseau interne, healthchecks et configuration non secrète.
- Create: `docker/Caddyfile` — routage `/` et `/api/*`.
- Create: `apps/web/Dockerfile` et `apps/api/Dockerfile` — builds multi-stage non-root.
- Create: `docker/postgres/healthcheck.sh` — contrôle de disponibilité sans secret dans la sortie.
- Create: `.dockerignore` — exclusions des dépendances, builds, logs, environnements et fichiers locaux.
- Create: `.github/workflows/ci.yml` — qualité, tests, builds, audit et scans.
- Modify: `README.md` — démarrage local, commandes et limites F00.
- Modify: `docs/features/001-monorepo-foundation.md` — preuves et état réellement implémenté.
- Modify: `docs/project-status.md` — état global et lien de PR.

## Task 1: Workspace pnpm et TypeScript strict

**Files:**

- Create: `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`.
- Modify: `.gitignore` uniquement si un motif F00 manque.
- Test: `tests/architecture/workspace.test.ts`.

**Interfaces:**

- Produces: packages workspace détectables par pnpm et scripts racine `lint`, `typecheck`, `test`, `build` et `audit`.

- [ ] **Step 1: Write the failing test**

Créer `tests/architecture/workspace.test.ts` avec des assertions qui vérifient que `pnpm-workspace.yaml` référence `apps/*` et `packages/*`, que les quatre répertoires attendus existent et qu’aucun package ne déclare une dépendance vers un chemin interdit.

```ts
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

describe('workspace boundaries', () => {
  it('declares the application and package workspaces', () => {
    const workspace = readFileSync(resolve(root, 'pnpm-workspace.yaml'), 'utf8')
    expect(workspace).toContain('apps/*')
    expect(workspace).toContain('packages/*')
    expect(existsSync(resolve(root, 'apps/web'))).toBe(true)
    expect(existsSync(resolve(root, 'apps/api'))).toBe(true)
    expect(existsSync(resolve(root, 'packages/shared'))).toBe(true)
    expect(existsSync(resolve(root, 'packages/database'))).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/architecture/workspace.test.ts`

Expected: FAIL because the workspace manifests and target directories do not exist yet.

- [ ] **Step 3: Write minimal implementation**

Créer le workspace avec les scripts racine suivants : `lint`, `typecheck`, `test`, `build` et `audit`. Configurer `tsconfig.base.json` avec `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`, `noEmit: true` et des alias limités aux packages déclarés. Pin la version pnpm utilisée dans `package.json` et génère le lockfile avec cette version.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/architecture/workspace.test.ts`

Expected: PASS with one workspace-boundary test.

- [ ] **Step 5: Run static checks**

Run: `pnpm install --frozen-lockfile && pnpm typecheck`

Expected: installation reproductible and TypeScript exit code 0.

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json .gitignore tests/architecture/workspace.test.ts
git commit -m "chore: scaffold pnpm workspace"
```

## Task 2: Packages shared et frontière database

**Files:**

- Create: `packages/shared/package.json`, `packages/shared/tsconfig.json`, `packages/shared/src/index.ts`.
- Create: `packages/database/package.json`, `packages/database/tsconfig.json`, `packages/database/src/index.ts`.
- Modify: `tests/architecture/workspace.test.ts` pour vérifier l’absence d’import navigateur de `packages/database`.
- Test: `tests/architecture/database-boundary.test.ts`.

**Interfaces:**

- Produces: `@jdr-hub/shared` exporte uniquement des contrats neutres ; `@jdr-hub/database` est consommable par l’API et les scripts serveur, jamais par le bundle navigateur.

- [ ] **Step 1: Write the failing test**

Créer `tests/architecture/database-boundary.test.ts` qui parcourt uniquement les fichiers `apps/web/app`, `apps/web/components` et `apps/web/features`, puis échoue si un import contient `@jdr-hub/database`, `packages/database` ou un chemin vers `drizzle-orm` serveur.

```ts
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

describe('frontend database boundary', () => {
  it('does not import server database code', () => {
    const page = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../../apps/web/app/page.tsx'), 'utf8')
    expect(page).not.toMatch(/@jdr-hub\/database|packages\/database|drizzle-orm/)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/architecture/database-boundary.test.ts`

Expected: FAIL because the web app and package boundaries do not exist yet.

- [ ] **Step 3: Write minimal implementation**

Créer les deux packages avec des noms workspace stables. Exporter depuis `packages/shared/src/index.ts` uniquement un type `HealthResponse` si l’API et le web le partagent réellement ; laisser `packages/database/src/index.ts` vide de modèle métier et fournir seulement le point d’entrée serveur nécessaire à la suite.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/architecture/database-boundary.test.ts`

Expected: PASS and no browser import detected.

- [ ] **Step 5: Commit**

```bash
git add packages/shared packages/database tests/architecture/database-boundary.test.ts
git commit -m "chore: define shared package boundaries"
```

## Task 3: API Hono et endpoint de santé

**Files:**

- Create: `apps/api/package.json`, `apps/api/tsconfig.json`, `apps/api/src/app.ts`, `apps/api/src/index.ts`.
- Test: `apps/api/src/app.test.ts`.

**Interfaces:**

- Produces: `createApiApp(): Hono` ; `GET /health` répond `{ data: { status: "ok" }, error: null, meta: { requestId: string } }`.

- [ ] **Step 1: Write the failing test**

Créer le test Hono suivant avant `src/app.ts` :

```ts
import { describe, expect, it } from 'vitest'
import { createApiApp } from './app'

describe('GET /health', () => {
  it('returns the stable health envelope and a request id', async () => {
    const response = await createApiApp().request('/health')
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      data: { status: 'ok' },
      error: null,
      meta: { requestId: expect.any(String) },
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @jdr-hub/api vitest run src/app.test.ts`

Expected: FAIL because `createApiApp` is not defined.

- [ ] **Step 3: Write minimal implementation**

Dans `apps/api/src/app.ts`, créer l’application Hono, générer un `requestId` non sensible par requête et déclarer `GET /health`. Dans `src/index.ts`, utiliser l’adaptateur Node Hono pour écouter sur le port fourni par `PORT` avec une valeur locale non secrète par défaut. Ne pas loguer les headers, cookies ou variables d’environnement.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @jdr-hub/api vitest run src/app.test.ts`

Expected: PASS with the health envelope and a non-empty request ID.

- [ ] **Step 5: Run API typecheck**

Run: `pnpm --filter @jdr-hub/api typecheck`

Expected: exit code 0 with no suppressed TypeScript error.

- [ ] **Step 6: Commit**

```bash
git add apps/api
git commit -m "feat: add Hono health endpoint"
```

## Task 4: Next.js web shell

**Files:**

- Create: `apps/web/package.json`, `apps/web/tsconfig.json`, `apps/web/next.config.ts`, `apps/web/app/layout.tsx`, `apps/web/app/page.tsx`.
- Create: `apps/web/public/branding/logo.svg` by copying the official `docs/branding/logo.svg` without modification.
- Test: `tests/smoke/web-shell.test.ts`.

**Interfaces:**

- Produces: a server-rendered `/` page with the official logo, a semantic main landmark and a technical startup message; no database import in browser code.

- [ ] **Step 1: Write the failing test**

Créer un test statique qui vérifie l’existence du shell Next.js, l’utilisation de `logo.svg` et l’absence de `dangerouslySetInnerHTML` dans `apps/web`.

```ts
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const web = resolve(dirname(fileURLToPath(import.meta.url)), '../../apps/web')

describe('web shell', () => {
  it('has a server page and the official logo asset', () => {
    const page = readFileSync(resolve(web, 'app/page.tsx'), 'utf8')
    expect(existsSync(resolve(web, 'public/branding/logo.svg'))).toBe(true)
    expect(page).toContain('<main')
    expect(page).not.toContain('dangerouslySetInnerHTML')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/smoke/web-shell.test.ts`

Expected: FAIL because the Next.js shell and copied official logo do not exist.

- [ ] **Step 3: Write minimal implementation**

Créer une page Server Component minimale en français, avec `metadata` de base, `main` sémantique et le SVG officiel copié byte-for-byte. Ne pas créer de header applicatif complet ni de composant métier dans F00.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/smoke/web-shell.test.ts`

Expected: PASS and exact official logo asset present.

- [ ] **Step 5: Run web typecheck and build**

Run: `pnpm --filter @jdr-hub/web typecheck && pnpm --filter @jdr-hub/web build`

Expected: both commands exit 0 without browser/server boundary violations.

- [ ] **Step 6: Commit**

```bash
git add apps/web tests/smoke/web-shell.test.ts
git commit -m "feat: add Next.js web shell"
```

## Task 5: PostgreSQL et Docker Compose sécurisé

**Files:**

- Create: `docker-compose.yml`, `apps/web/Dockerfile`, `apps/api/Dockerfile`, `docker/postgres/healthcheck.sh`, `.dockerignore`.
- Modify: `packages/database/src/index.ts` only for non-secret connection construction.
- Test: `tests/infrastructure/compose-config.test.ts`.

**Interfaces:**

- Produces: services `web-next`, `api-hono`, `postgres` and a private Docker network; PostgreSQL has no public host port by default.

- [ ] **Step 1: Write the failing test**

Créer un test qui lit le fichier Compose et vérifie les trois services, l’absence de `ports` sur PostgreSQL, la présence d’un healthcheck, d’un réseau interne et de variables référencées sans valeur secrète versionnée.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/infrastructure/compose-config.test.ts`

Expected: FAIL because `docker-compose.yml` and the container definitions do not exist.

- [ ] **Step 3: Write minimal implementation**

Définir des services `web-next`, `api-hono` et `postgres`, un réseau interne pour PostgreSQL, des volumes nommés uniquement pour les données de développement, des healthchecks et des builds multi-stage. Les Dockerfiles créent un utilisateur applicatif non-root, n’installent pas de dépendance de développement dans l’image runtime et ne copient aucun fichier `.env`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/infrastructure/compose-config.test.ts`

Expected: PASS with all Compose security assertions.

- [ ] **Step 5: Validate Compose without starting production data**

Run: `docker compose config --quiet`

Expected: exit code 0 and no warning about unresolved required configuration. Use only local fake values from `.env.example` when a variable is needed.

- [ ] **Step 6: Commit**

```bash
git add docker-compose.yml apps/web/Dockerfile apps/api/Dockerfile docker/postgres/healthcheck.sh .dockerignore packages/database
git commit -m "chore: add secure local compose stack"
```

## Task 6: Reverse proxy et smoke test same-origin

**Files:**

- Create: `docker/Caddyfile`.
- Modify: `docker-compose.yml` pour ajouter le reverse proxy local et les dépendances de santé.
- Test: `tests/infrastructure/routing-smoke.test.ts`.

**Interfaces:**

- Produces: `/` route vers `web-next` et `/api/*` route vers `api-hono` sous un même hostname local.

- [ ] **Step 1: Write the failing test**

Créer le test qui vérifie la présence des deux règles de routage dans `docker/Caddyfile` et l’exposition d’un seul point d’entrée HTTP local.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/infrastructure/routing-smoke.test.ts`

Expected: FAIL because no reverse proxy configuration exists.

- [ ] **Step 3: Write minimal implementation**

Configurer Caddy pour router `/api/*` vers `api-hono` et le reste vers `web-next`. Ne pas ajouter de route d’administration, de wildcard CORS ou de port PostgreSQL public. Conserver le reverse proxy dans le périmètre local F00 pour tester le même comportement que l’architecture cible.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/infrastructure/routing-smoke.test.ts`

Expected: PASS on static routing assertions.

- [ ] **Step 5: Run integration smoke**

Run: `docker compose up --build -d && curl --fail http://localhost/ && curl --fail http://localhost/api/health && docker compose down`

Expected: `/` returns the Next.js shell, `/api/health` returns the stable Hono envelope, and Compose shuts down without deleting named development data.

- [ ] **Step 6: Commit**

```bash
git add docker/Caddyfile docker-compose.yml tests/infrastructure/routing-smoke.test.ts
git commit -m "test: verify same-origin local routing"
```

## Task 7: CI qualité, sécurité et scans

**Files:**

- Create: `.github/workflows/ci.yml`.
- Modify: `package.json` scripts only when a CI command needs a root entry point.
- Test: `tests/infrastructure/ci-config.test.ts`.

**Interfaces:**

- Produces: workflow déclenché sur les Pull Requests vers `develop` et sur `main`, avec permissions minimales et échecs bloquants.

- [ ] **Step 1: Write the failing test**

Créer un test statique qui vérifie que le workflow contient les jobs d’installation frozen-lockfile, lint, typecheck, tests, builds, audit, scan de secrets, analyse statique et scan d’images, et qu’aucune action n’est référencée par un tag mutable.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/infrastructure/ci-config.test.ts`

Expected: FAIL because `.github/workflows/ci.yml` does not exist.

- [ ] **Step 3: Write minimal implementation**

Créer un workflow à permissions minimales qui utilise `pnpm install --frozen-lockfile`, exécute les scripts du workspace, lance l’audit pnpm et configure les scans de secrets, code et images avec versions épinglées. Les actions GitHub sont référencées par SHA vérifié ; aucun token, secret ou résultat sensible n’est écrit dans les logs. Les checks critiques sont obligatoires pour les PR.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/infrastructure/ci-config.test.ts`

Expected: PASS with all required job and pinning assertions.

- [ ] **Step 5: Validate workflow and security locally**

Run: `pnpm audit --audit-level=high` and the repository’s configured secret/static/image scanners.

Expected: no high-severity dependency result, no secret value printed, and scanner exits 0 or records a documented, non-critical tool limitation in the F00 fiche.

- [ ] **Step 6: Commit**

```bash
git add .github/workflows/ci.yml tests/infrastructure/ci-config.test.ts package.json
git commit -m "ci: add quality and security gates"
```

## Task 8: Documentation, fiche F00 et vérification complète

**Files:**

- Modify: `README.md`.
- Modify: `docs/features/001-monorepo-foundation.md`.
- Modify: `docs/project-status.md`.

**Interfaces:**

- Produces: documentation exacte de ce qui est implémenté, commandes exécutées, résultats, preuve TDD, contrôles de sécurité, limites et statut `IN_REVIEW` avant l’ouverture de la PR vers `develop`.

- [ ] **Step 1: Write the failing documentation checks**

Vérifier que la fiche contient les commandes et résultats pour Red, Green, Refactor, la checklist de sécurité, les limites restantes et les travaux reportés. Vérifier que `docs/project-status.md` contient la ligne F00, la branche et le lien de PR.

- [ ] **Step 2: Run checks to verify the documentation is incomplete**

Run: `rg -n 'À faire|Non terminée|Non créée|Red|Green|Refactor|Contrôles de sécurité' docs/features/001-monorepo-foundation.md`

Expected: before implementation, the fiche shows incomplete evidence and status `IN_PROGRESS`; after implementation these placeholders are replaced with actual commands and results.

- [ ] **Step 3: Update only with observed results**

Reporter dans la fiche les commandes réellement exécutées, leurs codes de sortie, les limites et les contrôles de sécurité effectivement réalisés. Remplacer le statut global F00 par `IN_REVIEW` et renseigner la PR uniquement au moment de son ouverture. Ne jamais inventer de résultat ni consigner de valeur sensible.

- [ ] **Step 4: Run the complete verification set**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm audit --audit-level=high && docker compose config --quiet`

Expected: every command exits 0. Run the Compose and Playwright smoke checks as separate commands and record each result.

- [ ] **Step 5: Review the final diff and paths**

Run: `git diff --check develop...HEAD`, `git status --short --untracked-files=all`, `git diff --name-only develop...HEAD` and a secret scan that reports only paths/categories.

Expected: only F00 files and its documentation are included; no secret, build, `node_modules`, database dump or forbidden file is present.

- [ ] **Step 6: Commit documentation**

```bash
git add README.md docs/features/001-monorepo-foundation.md docs/project-status.md
git commit -m "docs: record monorepo foundation verification"
```

- [ ] **Step 7: Push and open the PR**

```bash
git push -u origin chore/monorepo-foundation
```

Open the Pull Request from `chore/monorepo-foundation` to `develop`, set F00 to `IN_REVIEW`, and include the exact verification results, TDD evidence, security controls, limits, manual checks and screenshots only if visual files changed. Do not merge; the owner validates and merges.

## Self-review checklist

- [ ] Workspace pnpm, TypeScript strict, Next.js, Hono and package boundaries are covered by Tasks 1–4.
- [ ] PostgreSQL, Docker, non-root execution, pinned images and healthchecks are covered by Task 5.
- [ ] Same-origin `/` and `/api/*` routing is covered by Task 6.
- [ ] CI quality, dependency, secret, static and image checks are covered by Task 7.
- [ ] F00 has no business migration or out-of-MVP feature.
- [ ] Security cases from the F00 specification are tested before implementation and recorded in the feature sheet.
- [ ] Final documentation distinguishes planned, implemented and remaining work.
- [ ] No task changes `main` directly or bypasses human review.
